const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", async function () {
          let raffle, raffleAddress, raffleEntranceFee, deployer
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              const { get } = deployments
              deployerSigner = await ethers.getSigner(deployer)
              raffleAddress = (await get("Raffle")).address
              raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[0],
                              )
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(raffleState, 0)
                              assert.equal(recentWinner, accounts[0].address)
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance + raffleEntranceFee,
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[0])
                  })
              })
          })
      })
