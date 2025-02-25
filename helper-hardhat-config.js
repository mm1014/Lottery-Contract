const { ethers } = require("hardhat")

const callbackGasLimit = "500000"

const DECIMALS = 8
const interval = "5"
const GAS_PRICE_LINK = 1e9 //link per gas
const INITIAL_ANSWER = 200000000000
const BASE_FEE = ethers.parseEther("0.25")
const entranceFee = ethers.parseEther("0.01")
const developmentChains = ["hardhat", "localhost"]
const VRF_SUB_FUND_AMOUNT = ethers.parseEther("1000").toString()

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2_5: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        entranceFee: entranceFee,
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "", // BigNumber
        callbackGasLimit: callbackGasLimit,
        interval: interval,
    },
    31337: {
        name: "hardhat",
        entranceFee: entranceFee,
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: callbackGasLimit,
        interval: interval,
    },
}

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
    BASE_FEE,
    GAS_PRICE_LINK,
    VRF_SUB_FUND_AMOUNT,
}
