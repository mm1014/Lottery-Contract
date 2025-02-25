const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { moveTime } = require("../../utils/move-time")
const { moveBlocks } = require("../../utils/move-blocks.js")
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle,
              vrfCoordinatorV2_5Mock,
              vrfCoordinatorV2_5Address,
              raffleAddress,
              raffleEntranceFee,
              deployer,
              interval
          const { chainId } = network.config
          const { get } = deployments
          beforeEach(async () => {
              await deployments.fixture(["all"])
              deployer = (await getNamedAccounts()).deployer
              deployerSigner = await ethers.getSigner(deployer)
              vrfCoordinatorV2_5Address = (await get("VRFCoordinatorV2_5Mock")).address
              vrfCoordinatorV2_5Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2_5Mock",
                  vrfCoordinatorV2_5Address,
                  deployerSigner,
              )
              raffleAddress = (await get("Raffle")).address
              raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = (await raffle.getInterval()).toString()
          })

          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  // Ideally we make our tests have just 1 assert per "it"
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.rejectedWith(
                      "Raffle_NotEnoughETHEntered",
                  )
              })
              it("doesn't allow entrance when raffle is calculating and reverts", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee }),
                  ).to.be.be.rejectedWith("Raffle_NotOpen") //just executes performupkeep but not executes fulfillRandomWords
              })
              it("records players when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const player = await raffle.getPlayer(0)
                  assert.equal(player, deployer)
              })
              it("emits a event RaffleEnter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter",
                  )
              })
          })

          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  //   await moveTime(interval)
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
                  await raffle.performUpkeep("0x")
                  //The call to performangUpkeep itself triggers the generation of new blocks, so there is no need to manually mine the blocks
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert(!upkeepNeeded)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
                  await moveBlocks(1)
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", () => {
              it("it can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts when checkupkeep is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.rejectedWith(
                      "Raffle_UpkeepNotNeeded",
                  )
              })
              it("updates the raffle state, emits and event, and calls the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const requestedRaffleWinnerLog = txReceipt.logs.find(
                      (log) => log.fragment && log.fragment.name === "RequestedRaffleWinner",
                  )
                  const requestId = requestedRaffleWinnerLog.args[0]
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId > 0)
                  assert(raffleState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await moveTime(interval)
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2_5Mock.fulfillRandomWords(0, raffleAddress), // reverts if not fulfilled
                  ).to.be.rejectedWith("InvalidRequest")
                  await expect(
                      vrfCoordinatorV2_5Mock.fulfillRandomWords(1, raffleAddress), // reverts if not fulfilled
                  ).to.be.rejectedWith("InvalidRequest")
              })
              it("picks a winner, resets the lottery, and sends money", async () => {
                  const accounts = await ethers.getSigners()
                  const shuffledAccounts = accounts.sort(() => Math.random() - 0.5)
                  for (let i = 0; i < shuffledAccounts.length; i++) {
                      const accountConnectedRaffle = raffle.connect(shuffledAccounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLastTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the WinnerPicked event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  shuffledAccounts[1],
                              )
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              assert.equal(recentWinner, shuffledAccounts[1].address)
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(numPlayers.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  (
                                      winnerStartingBalance +
                                      BigInt(shuffledAccounts.length + 1) * raffleEntranceFee
                                  ).toString(),
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })

                      const tx = await raffle.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await ethers.provider.getBalance(
                          shuffledAccounts[1],
                      )
                      const requestedRaffleWinnerLog = txReceipt.logs.find(
                          (log) => log.fragment && log.fragment.name === "RequestedRaffleWinner",
                      )
                      const requestId = requestedRaffleWinnerLog.args[0]
                      await vrfCoordinatorV2_5Mock.fulfillRandomWords(requestId, raffleAddress)
                  })
              })
          })
      })
