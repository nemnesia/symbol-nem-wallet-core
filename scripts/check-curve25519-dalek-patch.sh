#!/usr/bin/env bash
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
local_root="$repo_root/third_party/curve25519-dalek-4.1.3"
version='4.1.3'
archive_sha256='97fb8b7c4503de7d6ae7b42ab72a5a59857b4c937ec27a3d4539dba95b5ab2be'
archive_url="https://crates.io/api/v1/crates/curve25519-dalek/$version/download"
archive_path="${CURVE25519_DALEK_UPSTREAM_ARCHIVE:-}"
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

if test -z "$archive_path"; then
    archive_path="$temp_dir/curve25519-dalek-$version.crate"
    curl --fail --location --silent --show-error "$archive_url" --output "$archive_path"
fi

printf '%s  %s\n' "$archive_sha256" "$archive_path" | sha256sum --check --status -
tar --extract --file "$archive_path" --directory "$temp_dir"
upstream_root="$temp_dir/curve25519-dalek-$version"

test "$(sed -n 's/^version = "\([^"]*\)"$/\1/p' "$local_root/Cargo.toml" | head -n 1)" = "$version"

is_allowed_change() {
    case "$1" in
        src/scalar.rs|src/edwards.rs|src/backend/serial/u64/scalar.rs|src/backend/serial/u32/scalar.rs)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

while IFS= read -r relative_path; do
    relative_path=${relative_path#./}
    case "$relative_path" in
        .cargo-ok|.cargo_vcs_info.json)
            continue
            ;;
    esac
    local_path="$local_root/$relative_path"
    test -f "$local_path"
    if is_allowed_change "$relative_path"; then
        continue
    fi
    cmp --silent "$upstream_root/$relative_path" "$local_path"
done < <(cd "$upstream_root" && find . -type f -print | sort)

while IFS= read -r relative_path; do
    relative_path=${relative_path#./}
    case "$relative_path" in
        PATCHES.md|.cargo-ok|.cargo_vcs_info.json)
            continue
            ;;
    esac
    test -f "$upstream_root/$relative_path"
done < <(cd "$local_root" && find . -type f -print | sort)

expected_hash() {
    case "$1" in
        src/scalar.rs) printf '%s\n' '836e89c542f95e5e0931f18debdf6e217d80b1d18783983e2b93f317c7270654' ;;
        src/edwards.rs) printf '%s\n' '71bf64f0277aaab7752d9231e985ef8851ef4d6de2bd9a1f2790f60228763ba1' ;;
        src/backend/serial/u64/scalar.rs) printf '%s\n' 'c0cf6bddb1a178b651e4717fe59516722f732d156728ed1f9eb325b99b6dd536' ;;
        src/backend/serial/u32/scalar.rs) printf '%s\n' '7d430478563e4da3afab4f6b655c64094c8f9ad0888658630458ae987bf95a9f' ;;
        *) return 1 ;;
    esac
}

for relative_path in src/scalar.rs src/edwards.rs src/backend/serial/u64/scalar.rs src/backend/serial/u32/scalar.rs; do
    actual_hash=$(sha256sum "$local_root/$relative_path" | cut -d ' ' -f 1)
    test "$actual_hash" = "$(expected_hash "$relative_path")"
done

printf '%s\n' 'curve25519-dalek 4.1.3 local patch verification passed'
