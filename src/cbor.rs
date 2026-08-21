//! Wallet Store v1で使用する、決定的CBORの最小実装。
//!
//! 外部入力をそのまま汎用CBORとして受け入れず、unsigned integer map key、
//! definite length、最短integer表現、重複map keyなしという仕様上の制約を
//! parserで検証する。未知fieldは上位のStore decoderが意味解釈せず保持する。

use core::fmt;

use zeroize::Zeroize;

// Wallet Store v1の固定schemaに必要な深さ・要素数を十分に上回る、parserの資源上限。
// 入力長を超える配列・mapは個数だけでのcapacity確保を行わず、先に拒否する。
const MAX_NESTING_DEPTH: usize = 32;
const MAX_COLLECTION_ELEMENTS: usize = 65_536;

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Value {
    UInt(u64),
    /// CBOR major type 1。値は `-1 - value` の絶対表現を保持する。
    Negative(u64),
    Bytes(Vec<u8>),
    Text(String),
    Array(Vec<Value>),
    Map(Vec<(u64, Value)>),
    /// CBOR tag番号と、そのtagが修飾する値を保持する。
    Tag(u64, Box<Value>),
    /// CBORのfloatではないsimple valueを保持する。false/true/nullは専用variantを使う。
    Simple(u8),
    Bool(bool),
    Null,
}

impl Drop for Value {
    fn drop(&mut self) {
        match self {
            Self::Bytes(value) => value.zeroize(),
            Self::Text(value) => value.zeroize(),
            Self::UInt(_)
            | Self::Negative(_)
            | Self::Array(_)
            | Self::Map(_)
            | Self::Tag(_, _)
            | Self::Simple(_)
            | Self::Bool(_)
            | Self::Null => {}
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct CborError;

impl fmt::Display for CborError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("invalid deterministic CBOR")
    }
}

pub(crate) fn decode(input: &[u8]) -> Result<Value, CborError> {
    // ルートを1つだけ読み、後続byteがあれば不正なtrailing dataとして拒否する。
    let mut parser = Parser {
        input,
        offset: 0,
        depth: 0,
    };
    let value = parser.value()?;
    if parser.offset != input.len() {
        return Err(CborError);
    }
    Ok(value)
}

pub(crate) fn encode(value: &Value) -> Result<Vec<u8>, CborError> {
    let mut output = Vec::new();
    match write_value(value, &mut output) {
        Ok(()) => Ok(output),
        Err(error) => {
            output.zeroize();
            Err(error)
        }
    }
}

fn write_value(value: &Value, output: &mut Vec<u8>) -> Result<(), CborError> {
    match value {
        Value::UInt(value) => write_argument(0, *value, output),
        Value::Negative(value) => write_argument(1, *value, output),
        Value::Bytes(value) => {
            write_argument(2, value.len() as u64, output)?;
            output.extend_from_slice(value);
            Ok(())
        }
        Value::Text(value) => {
            write_argument(3, value.len() as u64, output)?;
            output.extend_from_slice(value.as_bytes());
            Ok(())
        }
        Value::Array(values) => {
            write_argument(4, values.len() as u64, output)?;
            for value in values {
                write_value(value, output)?;
            }
            Ok(())
        }
        Value::Map(entries) => {
            // CBOR map keyをunsigned integerの昇順へ正規化してdeterministicにする。
            let mut entries = entries.iter().collect::<Vec<_>>();
            entries.sort_by_key(|(key, _)| *key);
            if entries.windows(2).any(|pair| pair[0].0 == pair[1].0) {
                return Err(CborError);
            }
            write_argument(5, entries.len() as u64, output)?;
            for (key, value) in entries {
                write_argument(0, *key, output)?;
                write_value(value, output)?;
            }
            Ok(())
        }
        Value::Tag(tag, value) => {
            write_argument(6, *tag, output)?;
            write_value(value, output)
        }
        Value::Simple(value) => write_simple(*value, output),
        Value::Bool(value) => {
            output.push(if *value { 0xf5 } else { 0xf4 });
            Ok(())
        }
        Value::Null => {
            output.push(0xf6);
            Ok(())
        }
    }
}

fn write_simple(value: u8, output: &mut Vec<u8>) -> Result<(), CborError> {
    match value {
        // 20..22はBool/Nullの専用variantと同じwire値になるため、generic
        // Simpleとしては生成しない。
        0..=19 | 23 => {
            output.push(0xe0 | value);
            Ok(())
        }
        20..=22 => Err(CborError),
        // 24..31はRFC 8949でreservedのため生成しない。
        24..=31 => Err(CborError),
        // 32以上はadditional information 24と後続1 byteで表現する。
        32..=u8::MAX => {
            output.extend_from_slice(&[0xf8, value]);
            Ok(())
        }
    }
}

fn write_argument(major: u8, value: u64, output: &mut Vec<u8>) -> Result<(), CborError> {
    let prefix = major << 5;
    match value {
        0..=23 => output.push(prefix | value as u8),
        24..=0xff => output.extend_from_slice(&[prefix | 24, value as u8]),
        0x100..=0xffff => {
            output.push(prefix | 25);
            output.extend_from_slice(&(value as u16).to_be_bytes());
        }
        0x1_0000..=0xffff_ffff => {
            output.push(prefix | 26);
            output.extend_from_slice(&(value as u32).to_be_bytes());
        }
        _ => {
            output.push(prefix | 27);
            output.extend_from_slice(&value.to_be_bytes());
        }
    }
    Ok(())
}

struct Parser<'a> {
    input: &'a [u8],
    offset: usize,
    depth: usize,
}

impl<'a> Parser<'a> {
    fn take(&mut self, count: usize) -> Result<&'a [u8], CborError> {
        let end = self.offset.checked_add(count).ok_or(CborError)?;
        let bytes = self.input.get(self.offset..end).ok_or(CborError)?;
        self.offset = end;
        Ok(bytes)
    }

    fn value(&mut self) -> Result<Value, CborError> {
        if self.depth >= MAX_NESTING_DEPTH {
            return Err(CborError);
        }
        self.depth += 1;
        let result = self.value_inner();
        self.depth -= 1;
        result
    }

    fn value_inner(&mut self) -> Result<Value, CborError> {
        let initial = *self.take(1)?.first().ok_or(CborError)?;
        let major = initial >> 5;
        let additional = initial & 0x1f;
        // floatとindefinite lengthはWallet Store v1で使用しない。未知fieldの負整数、
        // tag、floatではないsimple valueは、意味解釈せず再出力できるよう保持する。
        match major {
            0 => Ok(Value::UInt(self.argument(additional)?)),
            1 => Ok(Value::Negative(self.argument(additional)?)),
            2 => {
                let length = self.length(additional)?;
                Ok(Value::Bytes(self.take(length)?.to_vec()))
            }
            3 => {
                let length = self.length(additional)?;
                let text = core::str::from_utf8(self.take(length)?).map_err(|_| CborError)?;
                Ok(Value::Text(text.to_owned()))
            }
            4 => {
                let length = self.collection_length(additional, false)?;
                let mut values = Vec::with_capacity(length);
                for _ in 0..length {
                    values.push(self.value()?);
                }
                Ok(Value::Array(values))
            }
            5 => {
                let length = self.collection_length(additional, true)?;
                let mut entries = Vec::with_capacity(length);
                let mut previous_key = None;
                for _ in 0..length {
                    let key = match self.value()? {
                        Value::UInt(key) => key,
                        _ => return Err(CborError),
                    };
                    // Deterministic CBORのmap key順序と重複をdecoderでも検証する。
                    if previous_key.is_some_and(|previous| key <= previous) {
                        return Err(CborError);
                    }
                    previous_key = Some(key);
                    entries.push((key, self.value()?));
                }
                Ok(Value::Map(entries))
            }
            6 => Ok(Value::Tag(
                self.argument(additional)?,
                Box::new(self.value()?),
            )),
            7 => match additional {
                0..=19 | 23 => Ok(Value::Simple(additional)),
                20 => Ok(Value::Bool(false)),
                21 => Ok(Value::Bool(true)),
                22 => Ok(Value::Null),
                24 => {
                    let value = self.take(1)?[0];
                    // 31以下は非canonicalまたはRFC 8949でreserved。
                    if value < 32 {
                        return Err(CborError);
                    }
                    Ok(Value::Simple(value))
                }
                // 25..27はfloat16/32/64、28..31はreservedまたはbreak。
                _ => Err(CborError),
            },
            _ => Err(CborError),
        }
    }

    fn argument(&mut self, additional: u8) -> Result<u64, CborError> {
        let (value, minimum) = match additional {
            0..=23 => (additional as u64, additional as u64),
            24 => (u64::from(self.take(1)?[0]), 24),
            25 => (
                u64::from(u16::from_be_bytes(
                    self.take(2)?.try_into().map_err(|_| CborError)?,
                )),
                0x100,
            ),
            26 => (
                u64::from(u32::from_be_bytes(
                    self.take(4)?.try_into().map_err(|_| CborError)?,
                )),
                0x1_0000,
            ),
            27 => (
                u64::from_be_bytes(self.take(8)?.try_into().map_err(|_| CborError)?),
                0x1_0000_0000,
            ),
            _ => return Err(CborError),
        };
        // RFC 8949 Core Deterministic Encodingの最短表現を要求する。
        if value < minimum {
            return Err(CborError);
        }
        Ok(value)
    }

    fn length(&mut self, additional: u8) -> Result<usize, CborError> {
        usize::try_from(self.argument(additional)?).map_err(|_| CborError)
    }

    fn collection_length(&mut self, additional: u8, map: bool) -> Result<usize, CborError> {
        let length = self.length(additional)?;
        let remaining_item_capacity = if map {
            self.input.len().saturating_sub(self.offset) / 2
        } else {
            self.input.len().saturating_sub(self.offset)
        };
        if length > MAX_COLLECTION_ELEMENTS || length > remaining_item_capacity {
            return Err(CborError);
        }
        Ok(length)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parser_rejects_resource_exhaustion_inputs_before_allocation_or_deep_recursion() {
        let huge_array = [0x9b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
        assert!(decode(&huge_array).is_err());

        let huge_map = [0xbb, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
        assert!(decode(&huge_map).is_err());

        let mut deeply_nested = vec![0x81; MAX_NESTING_DEPTH + 1];
        deeply_nested.push(0x80);
        assert!(decode(&deeply_nested).is_err());
    }

    #[test]
    fn parser_rejects_noncanonical_map_order_and_trailing_bytes() {
        // {1: 0, 0: 0} はmap key順序がdeterministic CBORに反する。
        assert!(decode(&[0xa2, 0x01, 0x00, 0x00, 0x00]).is_err());
        assert!(decode(&[0x01, 0x00]).is_err());
    }

    #[test]
    fn parser_round_trips_negative_integers_and_tags() {
        let encoded = [0xa2, 0x00, 0x20, 0x01, 0xc1, 0x82, 0x21, 0xf6];
        let value = decode(&encoded).unwrap();
        assert_eq!(encode(&value).unwrap(), encoded);
        match &value {
            Value::Map(entries) => {
                assert!(matches!(&entries[0].1, Value::Negative(0)));
                assert!(matches!(&entries[1].1, Value::Tag(1, _)));
            }
            _ => panic!("mapとしてdecodeされていません"),
        }
    }

    #[test]
    fn parser_round_trips_simple_values_and_undefined() {
        for (encoded, expected) in [
            (&[0xf7][..], Value::Simple(23)),
            (&[0xe0][..], Value::Simple(0)),
            (&[0xf8, 42][..], Value::Simple(42)),
        ] {
            let value = decode(encoded).unwrap();
            assert_eq!(value, expected);
            assert_eq!(encode(&value).unwrap(), encoded);
        }
    }

    #[test]
    fn parser_rejects_noncanonical_simple_values_and_floats() {
        // 0..23をadditional information 24で表す形式は非canonical。
        assert!(decode(&[0xf8, 23]).is_err());
        assert!(decode(&[0xf8, 20]).is_err());
        assert!(encode(&Value::Simple(20)).is_err());

        // RFC 8949でreservedのsimple valueはdecode/encodeともに拒否する。
        for value in 24..=31 {
            assert!(decode(&[0xf8, value]).is_err());
            assert!(encode(&Value::Simple(value)).is_err());
        }

        for (value, expected) in [
            (Value::Simple(23), &[0xf7][..]),
            (Value::Simple(32), &[0xf8, 0x20][..]),
            (Value::Simple(u8::MAX), &[0xf8, 0xff][..]),
        ] {
            let encoded = encode(&value).unwrap();
            assert_eq!(encoded, expected);
            assert_eq!(decode(&encoded).unwrap(), value);
        }

        // float16 / float32 / float64はStore v1で使用しない。
        assert!(decode(&[0xf9, 0x00, 0x00]).is_err());
        assert!(decode(&[0xfa, 0x00, 0x00, 0x00, 0x00]).is_err());
        assert!(decode(&[0xfb, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).is_err());
    }
}
