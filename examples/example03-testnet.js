/**
 * This example demonstrates creating a real jig on testnet using node.js.
 *
 * To run, execute `node example03-testnet.js` from its directory.
 */

const Run = require('../dist/run.node.min')

const purse = 'cQP1h2zumWrCr2zxciuNeho61QUGtQ4zBKWFauk7WEhFb8kvjRTh'
const run = new Run({ network: 'test', purse })

async function main () {
  class TradingCard extends Jig {
    setName (name) {
      this.name = name
    }
  }

  const token = new TradingCard()
  token.setName('Satoshi Nakamoto')
  await token.sync()

  // Try loading the token from its onchain location and comparing
  const token2 = await run.load(token.location)
  console.log('Same token: ', token.name === token2.name)
}

main().catch(e => console.error(e))
