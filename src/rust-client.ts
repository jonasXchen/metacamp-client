import * as web3 from '@solana/web3.js'
import * as borsh from '@project-serum/borsh'

import {initializeSolSignerKeypair, airdropSolIfNeeded, initializeEthSignerKeypair } from './initializeWallets'


// Define instruction buffer
const onchainDataInstructionLayout = borsh.struct([
    borsh.u8('instruction'),
    borsh.u8('id'),
    borsh.str('name'),
])


async function initializeOnchainAccount(signer: web3.Keypair, programId: web3.PublicKey, connection: web3.Connection) {
    
    // Create buffer skeleton with size of 1000 bytes
    let buffer = Buffer.alloc(1000)
    console.log(`Starting Buffer length: ${buffer.length}`)

    
    // Encode variables according to buffer layout
    const accountId = 11
    onchainDataInstructionLayout.encode(
        {
            instruction: 1,
            id: accountId,
            name: "Account1"
        },
        buffer
    )

    // Slice to new buffer with size of instruction layout
    buffer = buffer.slice(0, onchainDataInstructionLayout.getSpan(buffer))
    console.log(`Stripped Buffer length: ${buffer.length}`)

    // Deserialize on-chain data
    // const [initialized, id] = onchainAccountSchema.decode(buffer)

    // Convert number seed to uin8array
    let idSeedBuffer = new ArrayBuffer(1);
    let view = new DataView(idSeedBuffer);
    view.setInt8(0, accountId);
    let accountIdSeed = new Uint8Array(idSeedBuffer);
    console.log("accountIdSeed: ", accountIdSeed)

    // Derive PDA with seeds
    const [pda] = await web3.PublicKey.findProgramAddressSync(
        [signer.publicKey.toBuffer(), accountIdSeed],
        programId
    )
    console.log("PDA is:", pda.toBase58())

    // Create and send tx to target program
    const transaction = new web3.Transaction()
    const instruction = new web3.TransactionInstruction({
        programId: programId,
        data: buffer,
        keys: [
            {
                pubkey: signer.publicKey,
                isSigner: true,
                isWritable: false
            },
            {
                pubkey: pda,
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: web3.SystemProgram.programId,
                isSigner: false,
                isWritable: false
            }
        ]
    })
    transaction.add(instruction)
    const tx = await web3.sendAndConfirmTransaction(connection, transaction, [signer])
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`)
}


async function main() {
    const signer = initializeSolSignerKeypair()
    const signerEth = initializeEthSignerKeypair()
    
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'))

    await airdropSolIfNeeded(signer, connection)
    
    const onChainProgramId = new web3.PublicKey('HkrkgJwBg42LfxrzkkJZqy1Tow7wHqARQDmaQnjR2iZm')
    await initializeOnchainAccount(signer, onChainProgramId, connection)
}

main().then(() => {
    console.log('Finished successfully')
    process.exit(0)
}).catch(error => {
    console.log(error)
    process.exit(1)
})