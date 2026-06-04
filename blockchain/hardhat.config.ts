import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "solidity-coverage";
import "dotenv/config";

const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ??
  // Anvil cuenta 0 (bien conocida — NUNCA usar en mainnet)
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ZKTANENBAUM_RPC =
  process.env.ZKTANENBAUM_RPC ?? "https://rpc-zk.tanenbaum.io";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin v5 usa el opcode mcopy (EIP-5656), introducido en Cancun.
      // Sin esto, 0.8.24 compila para "shanghai" y falla con "mcopy not found".
      // Anvil local (demo, D7) soporta Cancun. Para deploy a testnet, verificar
      // que la red destino soporte Cancun antes de desplegar.
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    zkTanenbaum: {
      url: ZKTANENBAUM_RPC,
      chainId: 57057,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
