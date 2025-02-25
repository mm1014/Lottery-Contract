const { network, ethers, getNamedAccounts, deployments } = require("hardhat")
const {
    developmentChains,
    networkConfig,
    VRF_SUB_FUND_AMOUNT,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function () {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2_5Address, subscriptionId, vrfCoordinatorV2_5Mock

    if (developmentChains.includes(network.name)) {
        const deployerSigner = await ethers.getSigner(deployer)
        vrfCoordinatorV2_5Address = (await get("VRFCoordinatorV2_5Mock")).address
        vrfCoordinatorV2_5Mock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2_5Address,
            deployerSigner,
        )
        const transactionReceipt = await (await vrfCoordinatorV2_5Mock.createSubscription()).wait(1)
        subscriptionId = transactionReceipt.logs[0].topics[1]
        await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2_5Address = networkConfig[chainId]["vrfCoordinatorV2_5"] //dev chains
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const args = [
        vrfCoordinatorV2_5Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(raffle.address, args)
    }
    await vrfCoordinatorV2_5Mock.addConsumer(subscriptionId, raffle.address)
    log("Consumer is added")
    log("Raffle Deployed!")
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
