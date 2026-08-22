//! deterministic CBORのcanonical表現、未知wire value、資源上限を検証する。

use super::*;

#[test]
fn parser_rejects_resource_exhaustion_inputs_before_allocation_or_deep_recursion() {
    // 巨大なcollection長と深いnestingを、allocationや再帰の前に拒否する。
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
    // Store v1で意味解釈しない負数・tagも、wire値を保持して再出力できる。
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
    // Bool/Nullと衝突しないsimple value、およびundefined相当の値を検証する。
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

#[test]
fn cbor_error_display_is_stable() {
    assert_eq!(CborError.to_string(), "invalid deterministic CBOR");
}
