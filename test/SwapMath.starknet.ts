import { getStarknetContractFactory } from 'hardhat-warp/dist/testing'
import BN from 'bn.js'
import {expect} from 'chai';
import { Uint256 } from '../typechain-types/SwapMathTest__WC__SwapMathTest_compiled';
import { encodePriceSqrt, expandTo18Decimals } from './shared/utilities'
import { SqrtPriceMathTest__WC__SqrtPriceMathTest_compiled, SwapMathTest__WC__SwapMathTest_compiled } from '../typechain-types'

var Q128 = new BN(2).pow(new BN(128))
function toUint256(x: number | BN | string): Uint256 {
    var num = new BN(x);
    return {high: num.div(Q128), low: num.mod(Q128)};
}

function toBN(x: Uint256) {
    return new BN(x.high).mul(Q128).add(new BN(x.low));
}

function Uint256toString(x: Uint256) {
    return toBN(x).toString();
}

describe('SwapMath', () => {
  let swapMath: SwapMathTest__WC__SwapMathTest_compiled
  let sqrtPriceMath: SqrtPriceMathTest__WC__SqrtPriceMathTest_compiled
  before(async () => {
    const swapMathTestFactory = await getStarknetContractFactory('SwapMathTest')
    const sqrtPriceMathTestFactory = await getStarknetContractFactory('SqrtPriceMathTest')
    swapMath = (await swapMathTestFactory.deploy()) as SwapMathTest__WC__SwapMathTest_compiled
    sqrtPriceMath = (await sqrtPriceMathTestFactory.deploy()) as SqrtPriceMathTest__WC__SqrtPriceMathTest_compiled
  })

  describe('#computeSwapStep', () => {
    it('exact amount in that gets capped at price target in one for zero', async () => {
      const price = encodePriceSqrt(1, 1)
      const priceTarget = encodePriceSqrt(101, 100)
      const liquidity = expandTo18Decimals(2)
      const amount = expandTo18Decimals(1)
      const fee = 600
      const zeroForOne = 0

      const res = await swapMath.computeSwapStep_100d3f74(
        price.toString(),
        priceTarget.toString(),
        liquidity.toString(),
        toUint256(amount.toString()),
        fee
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('9975124224178055')
      expect(Uint256toString(feeAmount)).to.eq('5988667735148')
      expect(amountOut).to.eq('9925619580021728')
      expect(amountIn.add(toBN(feeAmount)).toString(), 'entire amount is not used').to.lt(amount.toString())

      const priceAfterWholeInputAmount = await sqrtPriceMath.getNextSqrtPriceFromInput_aa58276a(
        price.toString(),
        liquidity.toString(),
        toUint256(amount.toString()),
        zeroForOne
      )

      expect(sqrtQ, 'price is capped at price target').to.eq(priceTarget.toString())
      expect(sqrtQ, 'price is less than price after whole input amount').to.lt(priceAfterWholeInputAmount[0].toString())
    })

    it('exact amount out that gets capped at price target in one for zero', async () => {
      const price = encodePriceSqrt(1, 1)
      const priceTarget = encodePriceSqrt(101, 100)
      const liquidity = expandTo18Decimals(2)
      const amount = expandTo18Decimals(1).mul(-1)
      const fee = 600
      const zeroForOne = 0

      const res = await swapMath.computeSwapStep_100d3f74(
        price.toString(),
        priceTarget.toString(),
        liquidity.toString(),
        toUint256(amount.toString()),
        fee
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('9975124224178055')
      expect(Uint256toString(feeAmount)).to.eq('5988667735148')
      expect(amountOut).to.eq('9925619580021728')
      expect(amountOut, 'entire amount out is not returned').to.lt(amount.mul(-1).toString())

      const priceAfterWholeOutputAmount = await sqrtPriceMath.getNextSqrtPriceFromOutput_fedf2b5f(
        price.toString(),
        liquidity.toString(),
        toUint256(amount.mul(-1).toString()),
        zeroForOne
      )

      expect(sqrtQ, 'price is capped at price target').to.eq(priceTarget.toString())
      expect(sqrtQ, 'price is less than price after whole output amount').to.lt(priceAfterWholeOutputAmount[0].toString())
    })

    it('exact amount in that is fully spent in one for zero', async () => {
      const price = encodePriceSqrt(1, 1)
      const priceTarget = encodePriceSqrt(1000, 100)
      const liquidity = expandTo18Decimals(2)
      const amount = expandTo18Decimals(1)
      const fee = 600
      const zeroForOne = 0

      const res = await swapMath.computeSwapStep_100d3f74(
        price.toString(),
        priceTarget.toString(),
        liquidity.toString(),
        toUint256(amount.toString()),
        fee
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('999400000000000000')
      expect(Uint256toString(feeAmount)).to.eq('600000000000000')
      expect(amountOut).to.eq('666399946655997866')
      expect(amountIn.add(toBN(feeAmount)).toString(), 'entire amount is used').to.eq(amount.toString())

      const priceAfterWholeInputAmountLessFee = await sqrtPriceMath.getNextSqrtPriceFromInput_aa58276a(
        price.toString(),
        liquidity.toString(),
        toUint256(new BN(amount.toString()).sub(toBN(feeAmount)).toString()),
        zeroForOne
      )

      expect(sqrtQ, 'price does not reach price target').to.be.lt(priceTarget.toString())
      expect(sqrtQ, 'price is equal to price after whole input amount').to.eq(priceAfterWholeInputAmountLessFee[0].toString())
    })

    it('exact amount out that is fully received in one for zero', async () => {
      const price = encodePriceSqrt(1, 1)
      const priceTarget = encodePriceSqrt(10000, 100)
      const liquidity = expandTo18Decimals(2)
      const amount = expandTo18Decimals(1).mul(-1)
      const fee = 600
      const zeroForOne = 0

      const res = await swapMath.computeSwapStep_100d3f74(
        price.toString(),
        priceTarget.toString(),
        liquidity.toString(),
        toUint256(amount.toString()),
        fee
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('2000000000000000000')
      expect(Uint256toString(feeAmount)).to.eq('1200720432259356')
      expect(amountOut).to.eq(amount.mul(-1).toString())

      const priceAfterWholeOutputAmount = await sqrtPriceMath.getNextSqrtPriceFromOutput_fedf2b5f(
        price.toString(),
        liquidity.toString(),
        toUint256(amount.mul(-1).toString()),
        zeroForOne
      )

      expect(sqrtQ, 'price does not reach price target').to.be.lt(priceTarget.toString())
      expect(sqrtQ, 'price is less than price after whole output amount').to.eq(priceAfterWholeOutputAmount[0].toString())
    })

    it('amount out is capped at the desired amount out', async () => {
      const res = await swapMath.computeSwapStep_100d3f74(
        '417332158212080721273783715441582',
        '1452870262520218020823638996',
        '159344665391607089467575320103',
        toUint256('-1'),
        1
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('1')
      expect(Uint256toString(feeAmount)).to.eq('1')
      expect(amountOut).to.eq('1') // would be 2 if not capped
      expect(sqrtQ).to.eq('417332158212080721273783715441581')
    })

    it('target price of 1 uses partial input amount', async () => {
      const res = await swapMath.computeSwapStep_100d3f74(
        '2',
        '1',
        '1',
        toUint256('3915081100057732413702495386755767'),
        1
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('39614081257132168796771975168')
      expect(Uint256toString(feeAmount)).to.eq('39614120871253040049813')
      expect(amountIn.add(toBN(feeAmount)).toString()).to.be.lte('3915081100057732413702495386755767')
      expect(amountOut).to.eq('0')
      expect(sqrtQ).to.eq('1')
    })

    it('entire input amount taken as fee', async () => {
      const res = await swapMath.computeSwapStep_100d3f74(
        '2413',
        '79887613182836312',
        '1985041575832132834610021537970',
        toUint256('10'),
        1872
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountIn.toString()).to.eq('0')
      expect(Uint256toString(feeAmount)).to.eq('10')
      expect(amountOut).to.eq('0')
      expect(sqrtQ).to.eq('2413')
    })

    it('handles intermediate insufficient liquidity in zero for one exact output case', async () => {
      const sqrtP = new BN('20282409603651670423947251286016')
      const sqrtPTarget = sqrtP.mul(new BN(11)).div(new BN(10))
      const liquidity = 1024
      // virtual reserves of one are only 4
      // https://www.wolframalpha.com/input/?i=1024+%2F+%2820282409603651670423947251286016+%2F+2**96%29
      const amountRemaining = -4
      const feePips = 3000
      const res = await swapMath.computeSwapStep_100d3f74(
        sqrtP.toString(),
        sqrtPTarget.toString(),
        liquidity,
        toUint256(amountRemaining),
        feePips
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountOut).to.eq('0')
      expect(sqrtQ).to.eq(sqrtPTarget.toString())
      expect(amountIn.toString()).to.eq('26215')
      expect(Uint256toString(feeAmount)).to.eq('79')
    })

    it('handles intermediate insufficient liquidity in one for zero exact output case', async () => {
      const sqrtP = new BN('20282409603651670423947251286016')
      const sqrtPTarget = sqrtP.mul(new BN(9)).div(new BN(10))
      const liquidity = 1024
      // virtual reserves of zero are only 262144
      // https://www.wolframalpha.com/input/?i=1024+*+%2820282409603651670423947251286016+%2F+2**96%29
      const amountRemaining = -263000
      const feePips = 3000
      const res = await swapMath.computeSwapStep_100d3f74(
        sqrtP.toString(),
        sqrtPTarget.toString(),
        liquidity,
        toUint256(amountRemaining),
        feePips
      )

      const amountIn = res[0];
      const amountOut = Uint256toString(res[1]); 
      const sqrtQ = Uint256toString(res[2]);
      const feeAmount  = res[3];

      expect(amountOut).to.eq('26214')
      expect(sqrtQ).to.eq(sqrtPTarget.toString())
      expect(amountIn.toString()).to.eq('1')
      expect(Uint256toString(feeAmount)).to.eq('1')
    })

    // describe('gas', () => {
    //   it('swap one for zero exact in capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(101, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact in capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact out capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(101, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1).mul(-1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact out capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1).mul(-1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact in partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(1010, 100),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact in partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 1000),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact out partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(1010, 100),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact out partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 1000),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    // })
  })
})
