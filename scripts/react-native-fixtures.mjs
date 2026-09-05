const REQUIRED_SYMBOLS = [
  "snwc_rn_module_identity",
  "symbolNemWalletCoreCxxModuleProvider",
];

function align(value, boundary) {
  return Math.ceil(value / boundary) * boundary;
}

function elfHash(name) {
  let value = 0;
  for (const byte of Buffer.from(name)) value = ((value << 4) + byte) ^ ((value >>> 24) & 0xf0);
  return value >>> 0;
}

export function validElf(machine, soname, { symbols = REQUIRED_SYMBOLS, exported = true } = {}) {
  const base = 0x400000;
  const headerSize = 64;
  const programHeaderOffset = headerSize;
  const programHeaderSize = 56;
  const programHeaderCount = 2;
  const dynamicOffset = align(programHeaderOffset + programHeaderSize * programHeaderCount, 8);
  const dynamicEntryCount = 7;
  const dynamicSize = dynamicEntryCount * 16;
  const stringOffset = align(dynamicOffset + dynamicSize, 8);
  const names = ["", soname, ...symbols];
  const stringTable = Buffer.from(`${names.join("\0")}\0`, "utf8");
  const symbolOffset = align(stringOffset + stringTable.length, 8);
  const symbolCount = symbols.length + 1;
  const symbolSize = symbolCount * 24;
  const hashOffset = align(symbolOffset + symbolSize, 8);
  const hashSize = 8 + 4 + symbolCount * 4;
  const codeOffset = align(hashOffset + hashSize, 16);
  const totalSize = codeOffset + 16;
  const bytes = Buffer.alloc(totalSize);

  bytes.writeUInt8(0x7f, 0);
  bytes.write("ELF", 1, "ascii");
  bytes.writeUInt8(2, 4);
  bytes.writeUInt8(1, 5);
  bytes.writeUInt8(1, 6);
  bytes.writeUInt16LE(3, 16);
  bytes.writeUInt16LE(machine, 18);
  bytes.writeUInt32LE(1, 20);
  bytes.writeBigUInt64LE(BigInt(base + codeOffset), 24);
  bytes.writeBigUInt64LE(BigInt(programHeaderOffset), 32);
  bytes.writeUInt16LE(headerSize, 52);
  bytes.writeUInt16LE(programHeaderSize, 54);
  bytes.writeUInt16LE(programHeaderCount, 56);

  const load = programHeaderOffset;
  bytes.writeUInt32LE(1, load);
  bytes.writeUInt32LE(7, load + 4);
  bytes.writeBigUInt64LE(0n, load + 8);
  bytes.writeBigUInt64LE(BigInt(base), load + 16);
  bytes.writeBigUInt64LE(0n, load + 24);
  bytes.writeBigUInt64LE(BigInt(totalSize), load + 32);
  bytes.writeBigUInt64LE(BigInt(totalSize), load + 40);
  bytes.writeBigUInt64LE(0x1000n, load + 48);
  const dynamicProgramHeader = load + programHeaderSize;
  bytes.writeUInt32LE(2, dynamicProgramHeader);
  bytes.writeUInt32LE(4, dynamicProgramHeader + 4);
  bytes.writeBigUInt64LE(BigInt(dynamicOffset), dynamicProgramHeader + 8);
  bytes.writeBigUInt64LE(BigInt(base + dynamicOffset), dynamicProgramHeader + 16);
  bytes.writeBigUInt64LE(0n, dynamicProgramHeader + 24);
  bytes.writeBigUInt64LE(BigInt(dynamicSize), dynamicProgramHeader + 32);
  bytes.writeBigUInt64LE(BigInt(dynamicSize), dynamicProgramHeader + 40);
  bytes.writeBigUInt64LE(8n, dynamicProgramHeader + 48);
  const dynamic = dynamicOffset;
  bytes.writeBigInt64LE(5n, dynamic);
  bytes.writeBigUInt64LE(BigInt(base + stringOffset), dynamic + 8);
  bytes.writeBigInt64LE(10n, dynamic + 16);
  bytes.writeBigUInt64LE(BigInt(stringTable.length), dynamic + 24);
  bytes.writeBigInt64LE(6n, dynamic + 32);
  bytes.writeBigUInt64LE(BigInt(base + symbolOffset), dynamic + 40);
  bytes.writeBigInt64LE(11n, dynamic + 48);
  bytes.writeBigUInt64LE(24n, dynamic + 56);
  bytes.writeBigInt64LE(4n, dynamic + 64);
  bytes.writeBigUInt64LE(BigInt(base + hashOffset), dynamic + 72);
  bytes.writeBigInt64LE(14n, dynamic + 80);
  bytes.writeBigUInt64LE(BigInt(names[0].length + 1), dynamic + 88);
  bytes.writeBigInt64LE(0n, dynamic + 96);
  bytes.writeBigUInt64LE(0n, dynamic + 104);

  stringTable.copy(bytes, stringOffset);
  const stringOffsets = [];
  let stringIndex = 0;
  for (const name of names) {
    stringOffsets.push(stringIndex);
    stringIndex += Buffer.byteLength(name) + 1;
  }
  for (let index = 0; index < symbols.length; index += 1) {
    const offset = symbolOffset + (index + 1) * 24;
    bytes.writeUInt32LE(stringOffsets[index + 2], offset);
    bytes.writeUInt8(exported ? 0x12 : 0x02, offset + 4);
    bytes.writeUInt16LE(1, offset + 6);
    bytes.writeBigUInt64LE(BigInt(base + codeOffset + index), offset + 8);
  }
  bytes.writeUInt32LE(1, hashOffset);
  bytes.writeUInt32LE(symbolCount, hashOffset + 4);
  bytes.writeUInt32LE(1, hashOffset + 8);
  for (let index = 0; index < symbolCount; index += 1) {
    bytes.writeUInt32LE(index === 0 ? 0 : index, hashOffset + 12 + index * 4);
  }
  return bytes;
}

function machOObject(platform, { symbols = REQUIRED_SYMBOLS, exported = true } = {}) {
  const headerSize = 32;
  const segmentCommandSize = 72 + 80;
  const buildCommandSize = 24;
  const symbolCommandSize = 24;
  const commandSize = segmentCommandSize + buildCommandSize + symbolCommandSize;
  const codeOffset = headerSize + commandSize;
  const symbolOffset = align(codeOffset + 16, 8);
  const stringTable = Buffer.from(`\0${symbols.map((name) => `_${name}`).join("\0")}\0`, "utf8");
  const stringOffset = symbolOffset + (symbols.length + 1) * 16;
  const totalSize = stringOffset + stringTable.length;
  const bytes = Buffer.alloc(totalSize);
  bytes.writeUInt32LE(0xfeedfacf, 0);
  bytes.writeUInt32LE(0x0100000c, 4);
  bytes.writeUInt32LE(0, 8);
  bytes.writeUInt32LE(1, 12);
  bytes.writeUInt32LE(3, 16);
  bytes.writeUInt32LE(commandSize, 20);
  bytes.writeUInt32LE(0x2000000, 24);
  const segment = 32;
  bytes.writeUInt32LE(0x19, segment);
  bytes.writeUInt32LE(segmentCommandSize, segment + 4);
  bytes.write("__TEXT", segment + 8, "ascii");
  bytes.writeBigUInt64LE(0n, segment + 24);
  bytes.writeBigUInt64LE(BigInt(totalSize), segment + 32);
  bytes.writeBigUInt64LE(0n, segment + 40);
  bytes.writeBigUInt64LE(BigInt(totalSize), segment + 48);
  bytes.writeUInt32LE(7, segment + 56);
  bytes.writeUInt32LE(5, segment + 60);
  bytes.writeUInt32LE(1, segment + 64);
  bytes.writeUInt32LE(0, segment + 68);
  const section = segment + 72;
  bytes.write("__text", section, "ascii");
  bytes.write("__TEXT", section + 16, "ascii");
  bytes.writeBigUInt64LE(BigInt(codeOffset), section + 32);
  bytes.writeBigUInt64LE(16n, section + 40);
  bytes.writeUInt32LE(codeOffset, section + 48);
  const build = segment + segmentCommandSize;
  bytes.writeUInt32LE(0x32, build);
  bytes.writeUInt32LE(buildCommandSize, build + 4);
  bytes.writeUInt32LE(platform, build + 8);
  bytes.writeUInt32LE(0x000f0000, build + 12);
  bytes.writeUInt32LE(0, build + 16);
  bytes.writeUInt32LE(0, build + 20);
  const symtab = build + buildCommandSize;
  bytes.writeUInt32LE(0x2, symtab);
  bytes.writeUInt32LE(symbolCommandSize, symtab + 4);
  bytes.writeUInt32LE(symbolOffset, symtab + 8);
  bytes.writeUInt32LE(symbols.length + 1, symtab + 12);
  bytes.writeUInt32LE(stringOffset, symtab + 16);
  bytes.writeUInt32LE(stringTable.length, symtab + 20);
  for (let index = 0; index < symbols.length; index += 1) {
    const offset = symbolOffset + (index + 1) * 16;
    let nameOffset = 1;
    for (let previous = 0; previous < index; previous += 1) nameOffset += Buffer.byteLength(`_${symbols[previous]}`) + 1;
    bytes.writeUInt32LE(nameOffset, offset);
    bytes.writeUInt8(exported ? 0x0f : 0x0e, offset + 4);
    bytes.writeUInt8(1, offset + 5);
    bytes.writeBigUInt64LE(BigInt(codeOffset + index), offset + 8);
  }
  stringTable.copy(bytes, stringOffset);
  return bytes;
}

export function validArchive(platform, options = {}) {
  const objects = options.objectPlatforms ?? [platform];
  const members = objects.map((objectPlatform, index) => {
    const content = machOObject(objectPlatform, options);
    const header = Buffer.alloc(60, " ");
    header.write(`snwc${index}.o/`, 0, "ascii");
    header.write(String(content.length).padEnd(10, " "), 48, "ascii");
    header.write("`\n", 58, "ascii");
    return Buffer.concat([header, content, content.length % 2 === 1 ? Buffer.from("\n") : Buffer.alloc(0)]);
  });
  return Buffer.concat([Buffer.from("!<arch>\n"), ...members]);
}

export function validReactNativeArtifact(targetId) {
  return targetId === "android-arm64-v8a"
    ? validElf(183, "libsymbol_nem_wallet_core_rn.so")
    : targetId === "android-x86_64"
      ? validElf(62, "libsymbol_nem_wallet_core_rn.so")
      : validArchive(targetId === "ios-arm64" ? 2 : 7);
}
