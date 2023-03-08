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
    transferFromSolana,
	parseSequenceFromLogEth,
	getEmitterAddressEth,
	CHAIN_ID_SOLANA,
    getSignedVAA,

    redeemOnSolana,
    redeemOnEth,
} from '@certusone/wormhole-sdk';

import * as web3 from '@solana/web3.js';
import * as ethers from 'ethers';
import { createPostSignedVaaTransactions, postVaa } from '@certusone/wormhole-sdk/lib/cjs/solana/sendAndConfirmPostVaa';

const XSGD_SOL = "7BjGUzsCJBXuT21QS4tkEdWf4DyFbJz4wAZRbkoCVizm";
const XSGD_ETH = "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96";
const EUROC_ETH = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
const EUROC_SOL = "";

// const WORMHOLE_RPC_HOST = "https://wormhole-v2-mainnet-api.certus.one"; // MAINNET
const WORMHOLE_RPC_HOST = "https://wormhole-v2-testnet-api.certus.one"; //TESTNET


export async function bridgeFromSolToEth(
    connection: web3.Connection, 
    ethRecipientAddress: Buffer | Uint8Array, 
    solMintAddress: web3.PublicKey = new web3.PublicKey("7BjGUzsCJBXuT21QS4tkEdWf4DyFbJz4wAZRbkoCVizm"), // Default to XSGD,
    solSigner: web3.Keypair, 
    solTokenAmount: bigint,
    ) : Promise<web3.TransactionSignature> {

        // Define bridges and token data
        const SOL_BRIDGE_ADDRESS = "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth";
        const SOL_TOKEN_BRIDGE_ADDRESS = "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb";

        // // DEVNET
        // const SOL_BRIDGE_ADDRESS = "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        // const SOL_TOKEN_BRIDGE_ADDRESS = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";


        // determine destination address - an associated token account with mint address
        const solAta = await getAssociatedTokenAddressSync(
            solMintAddress,
            solSigner.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        // Submit SOL token transfer transaction - ETH needs to process and guardians need to sign before message is published on Wormhole
        const transaction = await transferFromSolana(
            connection,
            SOL_BRIDGE_ADDRESS,
            SOL_TOKEN_BRIDGE_ADDRESS,
            solSigner,
            solAta,
            solMintAddress,
            solTokenAmount,
            ethRecipientAddress,
            CHAIN_ID_ETH,
        );

        const signature = await connection.sendRawTransaction(transaction.serialize())

        return signature

    } 

export async function redeemTokenOnEth (
    signature: string, 
    connection: web3.Connection, 
    ethSigner: ethers.Signer
    ) : Promise<ethers.ContractReceipt> {

        // Define bridges and Wormhole RPC
        const ETH_TOKEN_BRIDGE_ADDRESS = "0x3ee18B2214AFF97000D974cf647E7C347E8fa585";
        const SOL_BRIDGE_ADDRESS = "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth";
        const SOL_TOKEN_BRIDGE_ADDRESS = "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb";
        const WORMHOLE_RPC_HOST = "https://wormhole-v2-mainnet-api.certus.one";

        // //DEVNET
        // const ETH_TOKEN_BRIDGE_ADDRESS = "0xF890982f9310df57d00f659cf4fd87e65adEd8d7";
        // const SOL_BRIDGE_ADDRESS = "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
        // const SOL_TOKEN_BRIDGE_ADDRESS = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";
        // const WORMHOLE_RPC_HOST = "https://wormhole-v2-testnet-api.certus.one";

        // Get the sequence number and emitter address required to fetch the signedVAA of our message
        const sequence = parseSequenceFromLogEth(signature, SOL_BRIDGE_ADDRESS);
        const emitterAddress = getEmitterAddressEth(SOL_TOKEN_BRIDGE_ADDRESS);

        // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
        const {vaaBytes} = await getSignedVAA(
            WORMHOLE_RPC_HOST,
            CHAIN_ID_SOLANA,
            emitterAddress,
            sequence
        );

        // Redeem tokens on Ethereum
        const receipt = await redeemOnEth(
            ETH_TOKEN_BRIDGE_ADDRESS,
            ethSigner,
            vaaBytes
        );

        return receipt

    }