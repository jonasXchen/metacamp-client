import * as web3 from '@solana/web3.js'
import * as ethers from 'ethers';

import { initializeSolSignerKeypair, initializeEthSignerKeypair } from './initializeWallets'

import { bridgeFromEthToSol, redeemTokenOnSol } from './wormhole/wormhole-eth-sol'




async function main() {

    const signerSol = initializeSolSignerKeypair();
    console.log(`Current SOL Public Key: ${signerSol.publicKey}`)
    const signerEth = initializeEthSignerKeypair();
    console.log(`Current ETH Public Key: ${await signerEth.getAddress()}`)
    
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
    const provider = ethers.getDefaultProvider();
    // const provider = new ethers.JsonRpcProvider('https://eth.w3node.com/e6ad46673015b07edceb7b5e49e5ab57f2521e79eb9f3d78d2449920f38b72c4/api');


    const solBalance = await connection.getParsedAccountInfo(signerSol.publicKey)
    console.log(`SOL balance: ${solBalance}`)

    const ethBalance = await provider.getBalance(await signerEth.getAddress())
    console.log(`ETH balance: ${ethBalance}`)

    const ethTokenAddress = "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96";
    const solRecipient = signerSol.publicKey;
    const ethTokenAmount = 1;
    
    const receipt = await bridgeFromEthToSol(connection, solRecipient, ethTokenAddress, ethTokenAmount, signerEth);
    console.log(receipt);

    // const signature = await redeemTokenOnSol(receipt, connection, signerSol);
    // console.log(signature);

}



main().then(() => {
    console.log('Finished successfully')
    process.exit(0)
}).catch(error => {
    console.log(error)
    process.exit(1)
})

