const { ethers, network, getNamedAccounts, deployments } = require("hardhat")
const { get } = deployments

let deployerSigner, raffleAddress, raffle
async function mockKeepers() {
    const { deployer } = await getNamedAccounts()
    deployerSigner = await ethers.getSigner(deployer)
    raffleAddress = (await get("Raffle")).address
    raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner)
    // const checkData = ethers.keccak256(ethers.toUtf8Bytes(""))
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x") //staticCall only executes the function without changing the state
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep("0x")
        const txReceipt = await tx.wait(1)
        const requestedRaffleWinnerLog = txReceipt.logs.find(
            (log) => log.fragment && log.fragment.name === "RequestedRaffleWinner",
        )
        let requestId
        if (requestedRaffleWinnerLog) {
            requestId = requestedRaffleWinnerLog.args[0]
            console.log("RequestId is:", requestId.toString())
        } else {
            console.log("RequestedRaffleWinner event not found")
        }
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle)
        }
    } else {
        console.log("No upkeep needed!")
    }
}

async function mockVrf(requestId, raffle) {
    const vrfCoordinatorV2_5Address = (await get("VRFCoordinatorV2_5Mock")).address
    const vrfCoordinatorV2_5Mock = await ethers.getContractAt(
        "VRFCoordinatorV2_5Mock",
        vrfCoordinatorV2_5Address,
        deployerSigner,
    )
    await vrfCoordinatorV2_5Mock.fulfillRandomWords(requestId, raffleAddress)
    const recentWinner = await raffle.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
