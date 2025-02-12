import axios from "axios";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const API_KEY = process.env.API_KEY;
const contractAddress = process.argv[2];
const WORKING_DIR = "./bera";

// API URLs
const getRoutescanUrl = (address) =>
  `https://api.routescan.io/v2/network/mainnet/evm/80094/etherscan/contract/getsourcecode?address=${address}`;
const BERASCAN_API_URL = "https://api.berascan.com/api";

function extractContractName(sourceCode) {
  try {
    // Parse the SourceCode content
    const parsedSource = JSON.parse(sourceCode);
    // Get the first key from sources object
    const firstSourceKey = Object.keys(parsedSource.sources)[0];
    return `${firstSourceKey}:${
      parsedSource.ContractName || firstSourceKey.split("/").pop().split(".")[0]
    }`;
  } catch (error) {
    console.error("Error parsing contract name:", error);
    return null;
  }
}

async function ensureDirectoryExists(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function fetchAndSaveSourceCode() {
  console.log("Fetching contract source code from RouteScan...");
  try {
    const response = await axios.get(getRoutescanUrl(contractAddress));
    const sourceFilePath = path.join(WORKING_DIR, `${contractAddress}.json`);

    // Get the first result from the API response
    const contractData = response.data.result[0];
    await writeFile(sourceFilePath, JSON.stringify(contractData, null, 2));
    console.log(`✅ Source code saved to: ${sourceFilePath}`);
    return contractData;
  } catch (error) {
    console.error("❌ Failed to fetch contract source code:", error.message);
    throw error;
  }
}

async function processSourceCode(jsonContent) {
  const outputFile = path.join(WORKING_DIR, `${contractAddress}.json`);

  let sourceCode = jsonContent.SourceCode;
  // Handle the case where SourceCode might be a JSON string itself
  if (sourceCode.startsWith("{") && sourceCode.endsWith("}")) {
    sourceCode = sourceCode.substring(1, sourceCode.length - 1);
  }

  await writeFile(outputFile, sourceCode);
  console.log(`✅ Extracted SourceCode saved to ${outputFile}`);
  return sourceCode;
}

async function verifyContract(sourceCode, jsonContent) {
  console.log("Preparing verification request...");

  // Extract contract name from source code
  const contractName =
    extractContractName(sourceCode) || jsonContent.ContractName || "Contract";

  const formData = new URLSearchParams();
  formData.append("apikey", API_KEY);
  formData.append("module", "contract");
  formData.append("action", "verifysourcecode");
  formData.append("contractaddress", process.argv[2]);
  formData.append("codeformat", "solidity-standard-json-input");
  formData.append("contractname", contractName);
  formData.append("compilerversion", jsonContent.CompilerVersion);
  formData.append("optimizationUsed", jsonContent.OptimizationUsed);
  formData.append("runs", jsonContent.Runs);
  formData.append(
    "constructorArguments",
    jsonContent.ConstructorArguments?.replace(/^0x/, "") || ""
  );
  formData.append("sourceCode", sourceCode);
  formData.append("evmversion", jsonContent.EVMVersion);

  console.log(
    "constructorArguments",
    jsonContent.ConstructorArguments?.replace(/^0x/, "") || ""
  );
  console.log("Submitting contract verification request to BeraScan...");
  try {
    const response = await axios.post(BERASCAN_API_URL, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log("Verification Response:", response.data);

    console.log(
      `📝 Contract: https://berascan.com/address/${contractAddress}#code`
    );

    response.data.status === "1" &&
      console.log(
        `⌛ Verification status: https://api.berascan.com/api?module=contract&action=checkverifystatus&guid=${response.data.result}&apikey=${API_KEY}`
      );
    return response.data;
  } catch (error) {
    console.error("❌ Failed to verify contract on BeraScan:", error.message);
    throw error;
  }
}

async function main() {
  // Check if contract address was provided
  if (!process.argv[2]) {
    console.error(
      "Please provide a contract address as a command line argument"
    );
    console.error("Usage: node verify.js <contract-address>");
    process.exit(1);
  }

  try {
    // Ensure working directory exists
    await ensureDirectoryExists(WORKING_DIR);

    // Fetch and save source code
    const jsonContent = await fetchAndSaveSourceCode(contractAddress);

    // Process source code
    const sourceCode = await processSourceCode(jsonContent);

    // Verify contract
    await verifyContract(sourceCode, jsonContent);
  } catch (error) {
    console.error("Script failed:", error.message);
    process.exit(1);
  }
}

main();
