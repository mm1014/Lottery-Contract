const { ethers } = require("hardhat")

async function enterRaffle() {
    let raffle
    const { get } = deployments
    const raffleAddress = (await get("Raffle")).address
    const signers = await ethers.getSigners()
    const shuffledSigners = signers.sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffledSigners.length; i++) {
        const signer = shuffledSigners[i]
        raffle = await ethers.getContractAt("Raffle", raffleAddress, signer)
        const entranceFee = await raffle.getEntranceFee()
        await raffle.enterRaffle({ value: entranceFee })
        console.log(`Account ${i} (${signer.address}) entered the raffle!`)
    }
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
