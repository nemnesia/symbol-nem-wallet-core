//! Wallet Store v1で使用する、決定的CBORの最小実装。
//!
//! 外部入力をそのまま汎用CBORとして受け入れず、unsigned integer map key、
//! definite length、最短integer表現、重複map keyなしという仕様上の制約を
//! parserで検証する。未知fieldは上位のStore decoderが無視して再保存時に落とす。

use core::fmt;

use zeroize::Zeroize;

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Value {
    UInt(u64),
    Bytes(Vec<u8>),
    Text(String),
    Array(Vec<Value>),
    Map(Vec<(u64, Value)>),
    Bool(bool),
    Null,
}

impl Drop for Value {
    fn drop(&mut self) {
        match self {
            Self::Bytes(value) => value.zeroize(),
            Self::Text(value) => value.zeroize(),
            Self::UInt(_) | Self::Array(_) | Self::Map(_) | Self::Bool(_) | Self::Null => {}
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
    let mut parser = Parser { input, offset: 0 };
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
}

impl<'a> Parser<'a> {
    fn take(&mut self, count: usize) -> Result<&'a [u8], CborError> {
        let end = self.offset.checked_add(count).ok_or(CborError)?;
        let bytes = self.input.get(self.offset..end).ok_or(CborError)?;
        self.offset = end;
        Ok(bytes)
    }

    fn value(&mut self) -> Result<Value, CborError> {
        let initial = *self.take(1)?.first().ok_or(CborError)?;
        let major = initial >> 5;
        let additional = initial & 0x1f;
        // negative integer、tag、float、indefinite lengthはWallet Store v1で使用しない。
        match major {
            0 => Ok(Value::UInt(self.argument(additional)?)),
            1 => Err(CborError),
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
                let length = self.length(additional)?;
                let mut values = Vec::with_capacity(length);
                for _ in 0..length {
                    values.push(self.value()?);
                }
                Ok(Value::Array(values))
            }
            5 => {
                let length = self.length(additional)?;
                let mut entries = Vec::with_capacity(length);
                for _ in 0..length {
                    let key = match self.value()? {
                        Value::UInt(key) => key,
                        _ => return Err(CborError),
                    };
                    // 同一map keyはdecode時点で拒否し、後段の意味解釈を一意にする。
                    if entries.iter().any(|(existing, _)| *existing == key) {
                        return Err(CborError);
                    }
                    entries.push((key, self.value()?));
                }
                Ok(Value::Map(entries))
            }
            6 => Err(CborError),
            7 => match additional {
                20 => Ok(Value::Bool(false)),
                21 => Ok(Value::Bool(true)),
                22 => Ok(Value::Null),
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
}
