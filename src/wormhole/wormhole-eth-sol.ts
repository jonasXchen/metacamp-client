import {
	getAssociatedTokenAddressSync,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
	getForeignAssetSolana,
	hexToUint8Array,
	tryNativeToHexString,
	CHAIN_ID_ETH,
    transferFromEth,
	parseSequenceFromLogEth,
	getEmitterAddressEth,
	CHAIN_ID_SOLANA,
    getSignedVAA,

    redeemOnSolana,
} from '@certusone/wormhole-sdk';

import * as web3 from '@solana/web3.js';
import * as ethers from 'ethers';
import { createPostSignedVaaTransactions } from '@certusone/wormhole-sdk/lib/cjs/solana/sendAndConfirmPostVaa';


const XSGD_SOL = "7BjGUzsCJBXuT21QS4tkEdWf4DyFbJz4wAZRbkoCVizm";
const XSGD_ETH = "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96";
const EUROC_ETH = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
const EUROC_SOL = ""

// const WORMHOLE_RPC_HOST = "https://wormhole-v2-mainnet-api.certus.one"; // MAINNET
const WORMHOLE_RPC_HOST = "https://wormhole-v2-testnet-api.certus.one" //TESTNET

export async function bridgeFromEthToSol(
    connection: web3.Connection, 
    solRecipient: web3.PublicKey, 
    ethTokenAddress: string = "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96", // default to XSGD
    ethTokenAmount: ethers.BigNumberish,
    ethSigner: ethers.Signer, 
    ) : Promise<ethers.ContractReceipt> {

        // Define bridges and token data
        const SOL_TOKEN_BRIDGE_ADDRESS = "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb";
        const ETH_TOKEN_BRIDGE_ADDRESS = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585";

        // // DEVNET
        // const SOL_TOKEN_BRIDGE_ADDRESS = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";
        // const ETH_TOKEN_BRIDGE_ADDRESS = "0xF890982f9310df57d00f659cf4fd87e65adEd8d7";

        // determine destination address - an associated token account with mint address
        const solMintAddress = new web3.PublicKey(
        (await getForeignAssetSolana(
            connection,
            SOL_TOKEN_BRIDGE_ADDRESS,
            CHAIN_ID_ETH,
            hexToUint8Array(tryNativeToHexString(ethTokenAddress, CHAIN_ID_ETH) || "")
        )) || ""
        );
        const recipientAddress = await getAssociatedTokenAddressSync(
            solMintAddress,
            solRecipient,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        // Submit ETH token transfer transaction - ETH needs to process and guardians need to sign before message is published on Wormhole
        const receipt = await transferFromEth(
            ETH_TOKEN_BRIDGE_ADDRESS,
            ethSigner,
            ethTokenAddress,
            ethTokenAmount,
            CHAIN_ID_SOLANA,
            recipientAddress.toBytes()
        );

        return receipt

    } 

export async function redeemTokenOnSol (
    receipt: ethers.ContractReceipt, 
    connection: web3.Connection, 
    solFeePayer: web3.Signer
    ) : Promise<string> {

        // Define bridges and Wormhole RPC
        const SOL_BRIDGE_ADDRESS = "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth";
        const SOL_TOKEN_BRIDGE_ADDRESS = "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb";
        const ETH_TOKEN_BRIDGE_ADDRESS = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585";
        const ETH_BRIDGE_ADDRESS = "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B";
        const WORMHOLE_RPC_HOST = "https://wormhole-v2-mainnet-api.certus.one";

        // // DEVNET
        // const SOL_BRIDGE_ADDRESS = "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        // const SOL_TOKEN_BRIDGE_ADDRESS = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";
        // const ETH_TOKEN_BRIDGE_ADDRESS = "0xF890982f9310df57d00f659cf4fd87e65adEd8d7";
        // const ETH_BRIDGE_ADDRESS = "0x706abc4E45D419950511e474C7B9Ed348A4a716c";
        // const WORMHOLE_RPC_HOST = "https://wormhole-v2-testnet-api.certus.one";

        // Get the sequence number and emitter address required to fetch the signedVAA of our message
        const sequence = parseSequenceFromLogEth(receipt, ETH_BRIDGE_ADDRESS);
        const emitterAddress = getEmitterAddressEth(ETH_TOKEN_BRIDGE_ADDRESS);

        // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
        const {vaaBytes} = await getSignedVAA(
            WORMHOLE_RPC_HOST,
            CHAIN_ID_ETH,
            emitterAddress,
            sequence
        );


        // Using signed VAA, execute transaction generated by {@link verifySignatures} and {@link postVaa}
        await createPostSignedVaaTransactions (
            connection,
            SOL_BRIDGE_ADDRESS,
            solFeePayer,
            vaaBytes
        )


        // Redeem tokens on Solana
        const transaction = await redeemOnSolana(
            connection,
            SOL_BRIDGE_ADDRESS,
            SOL_TOKEN_BRIDGE_ADDRESS,
            solFeePayer.publicKey,
            vaaBytes
        );

        await transaction.sign(solFeePayer)
        const signature = await connection.sendRawTransaction(transaction.serialize());

        const latestBlockhash = await connection.getLatestBlockhash()
        await connection.confirmTransaction(
            {
                signature: signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }
        );

        return signature

    }