// 此版DCloud将GNU libc写为gnu，pnpm 10按glibc识别，导致Linux编译器被跳过。
// 仅修正已核对的具体包和版本的安装元数据，不改二进制、版本或完整性摘要。
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (
        pkg.name === "@dcloudio/uts-linux-x64-gnu" &&
        pkg.version === "3.0.0-alpha-5020320260803001" &&
        Array.isArray(pkg.libc) &&
        pkg.libc.length === 1 &&
        pkg.libc[0] === "gnu"
      )
        pkg.libc = ["glibc"];
      return pkg;
    },
  },
};
