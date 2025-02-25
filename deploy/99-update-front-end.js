const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const fs = require("fs")
const FRONT_END_ADDRESSES_FILE = "../lottery-front/constants/contractAddress.json"
const FRONT_END_ADDRESSES_ABI = "../lottery-front/constants/abi.json"

//Write the addresses of Raffle contracts deployed in different environments to a file
let raffle
module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        await updateContractAddresses()
        updateAbi()
        console.log("Updated successfully!")
    }
}

async function updateContractAddresses() {
    const { deployer } = await getNamedAccounts()
    const { get } = deployments
    const deployerSigner = await ethers.getSigner(deployer)
    const raffleAddress = (await get("Raffle")).address
    raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner)
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
    const chainId = network.config.chainId.toString()
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffleAddress)) {
            currentAddresses[chainId].push(raffleAddress)
        }
    }
    {
        currentAddresses[chainId] = [raffleAddress]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

function updateAbi() {
    fs.writeFileSync(FRONT_END_ADDRESSES_ABI, JSON.stringify(raffle.interface.fragments))
}

module.exports.tags = ["all", "frontend"]
