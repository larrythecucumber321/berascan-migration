# Beratrail to BeraScan Verification Migration

This tool helps migrate contract verifications from Beratrail to BeraScan using both explorers' APIs.

## Quick Start

Import API key in `.env` file and run the commands:

```bash
npm install
npm run verify <contract_address>
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- BeraScan API key

## Installation

1. Clone this repository:

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your BeraScan API key:

```bash
cp .env.example .env
```

4. Add your API key to the `.env` file

## Usage

```bash
npm run verify <contract_address>
```

The tool will:

1. Fetch the contract verification data from Beratrail
2. Submit the verification to BeraScan
3. Return the verification GUID (to check status)

## Troubleshooting

If verification fails:

1. Check that the contract is verified on Beratrail
2. If Berascan rate limit is reached, try running the command again
3. Proxy contracts are not supported yet
