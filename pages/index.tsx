import Head from 'next/head'
import Image from 'next/image'
import { Inter } from '@next/font/google'
import styles from '../styles/Home.module.css'
import { BigNumber, Contract, providers, utils } from 'ethers'
import { useEffect, useRef, useState } from 'react'
import { ICO_CONTRACT_ABI, ICO_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS } from './constants'
import Web3Modal from "web3modal";

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const zero = BigNumber.from(0)

  const [walletConnected, setWalletConnected] = useState(false)
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero)
  const [balanceOfNextDevTokens, setBalanceOfNextDevTokens] = useState(zero)
  const [tokenAmount, setTokenAmount] = useState(zero)
  const [tokensMinted, setTokensMinted] = useState(zero)
  const [isOwner, setIsOwner] = useState(false)
  const web3ModalRef = useRef<{connect: () => any}>()

  async function getProvider(){
    const provider = await web3ModalRef.current?.connect()
    const web3Provider = new providers.Web3Provider(provider)
    const { chainId }  = await web3Provider.getNetwork()
    if (chainId !== 5) throw new Error('Connection Error: only Goerli allowed')

    return web3Provider
  }

  async function getSigner(){
    const provider = await getProvider()
    return provider.getSigner()
  }

  function getNftContract(provider: providers.JsonRpcSigner | providers.Web3Provider){
    return new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
  }

  function getICOContract(provider: providers.JsonRpcSigner | providers.Web3Provider){
    return new Contract(ICO_CONTRACT_ADDRESS, ICO_CONTRACT_ABI, provider);
  }

  async function getTokensToBeClaimed(){
    try {
      const provider = await getProvider()
      const NFTContract = getNftContract(provider)
      const ICOContract = getICOContract(provider)

      const signer = await getSigner()
      const address = await signer.getAddress()
      const balance = await NFTContract.balanceOf(address)
      if(balance === zero) {
        setTokensToBeClaimed(zero)
      } else {
        let amount = 0;

        for(let i = 0; i < balance; i++){
          const tokenId = await NFTContract.tokenOfOwnerByIndex(address, i)
          const claimed = await ICOContract.tokendIdsClaimed(tokenId)
          if(!claimed) amount++
          console.log({claimed})
        }
        console.log({amount})
        setTokensToBeClaimed(BigNumber.from(amount))
      }
    } catch(error){
      console.error(error)
      setTokensToBeClaimed(zero)
    }
  }

  async function getBalanceOfNextDevTokens(){
    try{
      const provider = await getProvider()
      const icoContract = getICOContract(provider)
      const signer = await getSigner()
      const address = await signer.getAddress()
      const balance = await icoContract.balanceOf(address)
      setBalanceOfNextDevTokens(balance)
    } catch(error) {
      console.error(error)
      setBalanceOfNextDevTokens(zero)
    }
  }

  async function mintNextDevToken(amount: BigNumber){
    try {
      const signer = await getSigner()
      const icoContract = getICOContract(signer)

      const value = amount.toNumber() * 0.001
      const tx = await icoContract.mint(amount, {value: utils.parseEther(value.toString())})
      await tx.wait()

      await getBalanceOfNextDevTokens()
      await getTotalTokensMinted()
      await getTokensToBeClaimed()
    } catch(error){
      console.error(error)
    }
  }

  async function claimNextDevTokens(){
    try{
      const signer = await getSigner()
      const icoContract = getICOContract(signer)
      const tx = await icoContract.claim()
      await tx.wait()
      window.alert('Successfully claimed Next Dev Tokens')
      await getBalanceOfNextDevTokens()
      await getTotalTokensMinted()
      await getTokensToBeClaimed()
    } catch(error){
      console.error(error)
    }
  }

  async function getTotalTokensMinted(){
    try {
      const provider = await getProvider()
      const icoContract = getICOContract(provider)
      const _tokensMinted = await icoContract.totalSupply()
      setTokensMinted(_tokensMinted)
    } catch(error) {
      console.error(error)
    }
  }

  async function getOwner(){
    try {
      const provider = await getProvider()
      const icoContract = getICOContract(provider)
      const _owner = await icoContract.owner()
      const signer = await getSigner()
      const address = await signer.getAddress()
      if(address.toLowerCase() === _owner.toLowerCase()){
        setIsOwner(true)
      }
    } catch(error) {
      console.error(error)
     }
  }

  async function withdrawCoins(){
    try {
      const signer = await getSigner()
      const icoContract = getICOContract(signer)

      const tx = await icoContract.withdraw()
      await tx.wait()
      await getOwner()
    } catch (error) {
      console.log(error)
    }
  }

  async function connectWallet(){
    try {
      await getProvider()
      setWalletConnected(true)
    } catch(error) {
      console.error(error)
    }
  }

  async function init(){
    await connectWallet()
    await getTotalTokensMinted()
    await getBalanceOfNextDevTokens()
    await getTokensToBeClaimed()
    getOwner()
  }

  useEffect(() => {
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: 'goerli',
        providerOptions: {},
        disableInjectedProvider: false
      })
      init()
    }

  }, [walletConnected, init])

  const renderButton = () => {
    // If we are currently waiting for something, return a loading button

    // If tokens to be claimed are greater than 0, Return a claim button
    // if (tokensToBeClaimed.gt(0)) {
    //   return (
    //     <div>
    //       <div className={styles.description}>
    //        <> {tokensToBeClaimed.mul(10)} Tokens can be claimed!</>
    //       </div>
    //       <button className={styles.button} onClick={claimNextDevTokens}>
    //         Claim Tokens
    //       </button>
    //     </div>
    //   );
    // }
    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount.gt(0))}
          onClick={() => mintNextDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };



  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfNextDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
              {/* Display additional withdraw button if connected wallet is owner */}
                {isOwner ? (
                  <div>
                <button className={styles.button} onClick={withdrawCoins}>
                               Withdraw Coins
                             </button>
                  </div>
                  ) : ("")
                }
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>

      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
