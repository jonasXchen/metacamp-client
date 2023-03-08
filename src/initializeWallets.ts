import * as web3 from '@solana/web3.js'
import * as fs from 'fs'
import { ethers } from 'ethers'

import dotenv from 'dotenv'
dotenv.config()

// Initialize Keypair for SOL
export function initializeSolSignerKeypair(): web3.Keypair {
    if (!process.env.PRIVATE_KEY) {
        console.log('Creating SOL keypair in .env file')
        const signer = web3.Keypair.generate()
        console.log(`Created SOL Public Key: ${signer.publicKey}`)

        // Append the new key-value pair to the contents of the .env file
        let envFileContents = fs.readFileSync('.env', 'utf-8');
        envFileContents += `PRIVATE_KEY=[${signer.secretKey.toString()}]\n`;
        fs.writeFileSync('.env', envFileContents)

        return signer
    }
    
    const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[]
    const secretKey = Uint8Array.from(secret)
    const keypairFromSecretKey = web3.Keypair.fromSecretKey(secretKey)
    console.log(`Current SOL Public Key: ${keypairFromSecretKey.publicKey}`)

    return keypairFromSecretKey
}

export async function airdropSolIfNeeded(signer: web3.Keypair, connection: web3.Connection) {
    const balance = await connection.getBalance(signer.publicKey)
    console.log('Public Key: ', signer.publicKey.toString())
    console.log('Current balance is', balance)
    if (balance < web3.LAMPORTS_PER_SOL) {
        console.log('Airdropping 1 SOL...')
        await connection.requestAirdrop(signer.publicKey, web3.LAMPORTS_PER_SOL)
    }
}

function convertUint8ArrayToHex(uint8Array: Uint8Array): string {
    // Convert each byte to its corresponding two-digit hex representation
    const hexArray = Array.from(uint8Array, byte => ('0' + byte.toString(16)).slice(-2));
    // Join the hex values into a single string
    const hexString = hexArray.join('');
    return hexString;
}

export function initializeEthSignerKeypair(): ethers.Signer {
    if (!process.env.PRIVATE_KEY_ETH) {
        console.log('Creating ETH signer in .env file')
        const privateKeyEth = "0x" + convertUint8ArrayToHex(web3.Keypair.generate().secretKey).substring(0, 64);
        const signer = new ethers.Wallet(privateKeyEth);
        console.log(`Created ETH Public Key: ${signer.address}`)

        // Append the new key-value pair to the contents of the .env file
        let envFileContents = fs.readFileSync('.env', 'utf-8');
        envFileContents += `PRIVATE_KEY_ETH=${privateKeyEth}\n`;
        fs.writeFileSync('.env', envFileContents)

        return signer
    }
    
    const privateKeyEth = process.env.PRIVATE_KEY_ETH
    const signer = new ethers.Wallet(privateKeyEth);
    console.log(`Current ETH Public Key: ${signer.address}`)

    return signer
}