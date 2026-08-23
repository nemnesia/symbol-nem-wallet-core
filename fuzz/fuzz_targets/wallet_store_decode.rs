#![no_main]

use libfuzzer_sys::fuzz_target;
use symbol_nem_wallet_core::list_profiles;

// `list_profiles` is the public read entry point that invokes the Wallet Store
// CBOR decoder without requiring a password or exposing decoded secrets.
fuzz_target!(|data: &[u8]| {
    let _ = list_profiles(data);
});
