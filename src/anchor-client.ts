import * as web3 from '@solana/web3.js'
import * as borsh from '@project-serum/borsh'

import {initializeSolSignerKeypair, airdropSolIfNeeded, initializeEthSignerKeypair } from './initializeWallets'

import { AnchorProvider, setProvider, Idl, Program, Wallet, BN } from "@project-serum/anchor"
import * as idl from './metacamp_anchor.json'



const onChainDataInstructionLayout = borsh.struct([
    borsh.u8('id'),
    borsh.str('name'),
])

async function initializeOnchainAccount(signer: web3.Keypair, programId: web3.PublicKey, connection: web3.Connection) {
    
    const provider = new AnchorProvider(connection, new Wallet(signer), {});
    setProvider(provider)

    const program = new Program(idl as Idl, programId);



    let buffer = Buffer.alloc(1000)
    // const movieTitle = `Braveheart${Math.random()*1000000}`
    const accountId = 5

    // Find PDA and bump
    const [pda, bump] = web3.PublicKey.findProgramAddressSync(
        [(new BN(accountId)).toBuffer(), signer.publicKey.toBuffer()],
        programId
    )
    console.log("PDA is:", pda.toBase58(), " with bump:", bump.toString())

    // // Read Anchor account
    // const account = await program.account.onchainAccount.fetch(pda)
    // console.log(account.toString())

    // Make tx to target program
    const tx = await program.methods
    .initialize( "Account1", accountId )
    .accounts({ onchainAccount: pda, initializer: signer.publicKey }
    )
    .signers([signer])
    .rpc()

    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`)
}

async function main() {
    const signer = initializeSolSignerKeypair()
    
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'))

    await airdropSolIfNeeded(signer, connection)
    
    const onChainProgramId = new web3.PublicKey('A31bjS1pFNcxkVNXP5LwwGNpejETipZJbXC3XGfGu5QY')
    await initializeOnchainAccount(signer, onChainProgramId, connection)
}

main().then(() => {
    console.log('Finished successfully')
    process.exit(0)
}).catch(error => {
    console.log(error)
    process.exit(1)
})