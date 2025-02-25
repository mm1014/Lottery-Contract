const { network } = require("hardhat")
const { developmentChains, BASE_FEE, GAS_PRICE_LINK } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK, "6340119911190630"]
    if (developmentChains.includes(network.name)) {
        await deploy("VRFCoordinatorV2_5Mock", {
            from: deployer,
            args: args,
            log: true,
        })
        log("Mocks Deployed!")
        log("--------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
