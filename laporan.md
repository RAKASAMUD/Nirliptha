# 📄 Laporan Hasil Pengerjaan Smart Contract Protocol — Nirlipta

**Proyek**: Nirlipta — Confidential Primary Market Auction Protocol  
**Jaringan**: Ethereum Sepolia Testnet  
**Teknologi Utama**: Nox Protocol (TEE-based Confidential Computing), Solidity ^0.8.28, ERC-7984, Gnosis Safe  
**Tanggal**: 24 Juli 2026  

---

## 1. Eksekutif Ringkasan (Executive Summary)

Protokol lelang **Nirlipta** diciptakan untuk memecahkan masalah kebocoran data (*front-running*, suap tender, dan konflik kepentingan) pada penerbitan perdana aset obligasi/RWA. Dengan memanfaatkan **Nox Protocol TEE Enclave**, seluruh jumlah penawaran ($Q$) dan harga ($P$) investor dienkripsi secara penuh secara *on-chain* sehingga tidak ada pihak manapun—termasuk issuer—yang dapat mengintip nilai penawaran sebelum deadline lelang berakhir.

Seluruh fungsionalitas smart contract dari **Milestone 0 hingga Milestone 3** telah **100% selesai dikembangkan, diuji, dan dieksekusi secara live di Ethereum Sepolia Testnet tanpa mock data**.

---

## 2. Arsitektur & Kontrak Terdeploy (Ethereum Sepolia Testnet)

Seluruh kontrak pintar telah dideploy ke jaringan **Ethereum Sepolia** dan terverifikasi secara penuh:

| Kontrak | Alamat (Address) | Etherscan Link | Deskripsi |
| :--- | :--- | :--- | :--- |
| **`cUSD`** | `0x7309886ee42Aa29a796A479A01Eef07a61c8F6Fd` | [Lihat di Etherscan](https://sepolia.etherscan.io/address/0x7309886ee42Aa29a796A479A01Eef07a61c8F6Fd) | Confidential USD Stablecoin (ERC-7984) untuk deposit & settlement lelang |
| **`cAsset`** | `0x43d81618774059F0172b7B32c972271a6440003D` | [Lihat di Etherscan](https://sepolia.etherscan.io/address/0x43d81618774059F0172b7B32c972271a6440003D) | Confidential RWA Bond Token (ERC-7984) aset lelang penerbitan |
| **`AuctionFactory`** | `0x39536Ea5789538D7F76999e8BDE5679526F815Df` | [Lihat di Etherscan](https://sepolia.etherscan.io/address/0x39536Ea5789538D7F76999e8BDE5679526F815Df) | Factory contract untuk membuat & mencatat instance lelang baru |
| **`Gnosis Safe`** | `0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63` | [Lihat di Etherscan](https://sepolia.etherscan.io/address/0x6Ca474410D2d9532e9355Ca754fe62a3E340dA63) | Multi-sig Treasury Issuer penampung dana penjualan akhir |
| **`Demo Auction`** | `0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86` | [Lihat di Etherscan](https://sepolia.etherscan.io/address/0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86) | Instance lelang aktif yang dieksekusi end-to-end |

---

## 3. Realisasi Fitur Utama Berdasarkan PRD

### 3.1. Sealed-Bid Uniform-Price Primary Auction
* **Penawaran Rahasia (`submitBid`)**: Investor mengirimkan $Q$ (kuantitas) dan $P$ (harga per unit) dalam bentuk terenkripsi (`euint256`). Dana jaminan ($Q \times P$) terkunci otomatis secara *confidential*.
* **Strategi FCFS (First-Come, First-Served)**: Apabila terjadi batas marjinal harga yang sama, alokasi diprioritaskan berdasarkan urutan penawaran terdaftar (`bidIndex`).
* **Pembersihan Harga Publik (Clearing Price)**: Menggunakan alur dua tahap aman (*two-step public decrypt*):
  1. `finalize()`: TEE Enclave menyortir penawaran, menentukan penawar menang, dan menandai clearing price.
  2. `publicDecrypt()` & `completeSettlement()`: Dekripsi publik dilakukan via TEE Gateway proof off-chain dan diselesaikan secara *on-chain*.

### 3.2. Lifecycle Lelang Berbasis State Machine
State pada `Auction.sol` berjalan secara ketat:
`AwaitingEscrow (0)` $\rightarrow$ `Open (1)` $\rightarrow$ `PendingReveal (2)` $\rightarrow$ `Settled (3)`

### 3.3. Akses Audit On-Demand & Rotasi Handle TEE (Milestone 3)
* **`grantAuditView`**: Issuer dapat melegalkan pihak auditor independen untuk mengintip alokasi penawar tertentu tanpa membuka identitas penawar lainnya.
* **`rotateHandles`**: Issuer dapat memutar (*rotate*) handle TEE setelah audit selesai. Akses auditor lama otomatis **buta (revoked)** terhadap data pasca-rotasi, sementara penawar tetap memegang kepemilikan aset secara privat.

### 3.4. Integrasi Treasury Multi-Sig (Gnosis Safe)
* **`withdrawToSafe`**: Seluruh dana hasil lelang publik yang berhasil terkumpul disetorkan langsung dari kontrak lelang ke alamat **Gnosis Safe** milik Issuer secara otomatis.

---

## 4. Bukti Eksekusi Live On-Chain (Sepolia Execution Trace)

Skenario eksekusi penuh dieksekusi menggunakan 5 akun investor dan 1 akun issuer:

1. **`createAuction`**: Instance lelang ter-deploy di alamat [`0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86`](https://sepolia.etherscan.io/address/0x3c35ea01f9c197d01Ad6345CA41EB4bFdac84a86).
2. **`confirmEscrow`**: Issuer melakukan escrow sebanyak **100,000 cAsset** ke kontrak lelang.
3. **`submitBid` (5 Bidder Rahasia)**:
   * **Bidder 1** ($Q=30\text{k}, P=1.20$): Tx [`0x130d7a7a...`](https://sepolia.etherscan.io/tx/0x130d7a7a)
   * **Bidder 2** ($Q=50\text{k}, P=1.10$): Tx [`0x00b6a701...`](https://sepolia.etherscan.io/tx/0x00b6a701)
   * **Bidder 3** ($Q=40\text{k}, P=1.05$): Tx [`0xb92600fc...`](https://sepolia.etherscan.io/tx/0xb92600fc)
   * **Bidder 4** ($Q=20\text{k}, P=1.05$): Tx [`0x8f3a3655...`](https://sepolia.etherscan.io/tx/0x8f3a3655)
   * **Bidder 5** ($Q=15\text{k}, P=0.95$): Tx [`0x331cd3df...`](https://sepolia.etherscan.io/tx/0x331cd3df)
4. **`finalize` (TEE Sorting)**:
   * **Tx Hash**: [`0xf7e820e8dd7f80f4cc856a53b50146f4965938c1245b3c2418ef4d72a58ad3a6`](https://sepolia.etherscan.io/tx/0xf7e820e8dd7f80f4cc856a53b50146f4965938c1245b3c2418ef4d72a58ad3a6)
5. **`completeSettlement`**:
   * On-chain clearing price terbukti sebesar **`1.050000 cUSD`** ($1.05 per unit).
6. **`claim` (Pengambilan Hak & Refund)**:
   * **Bidder 1** (Dapat 30k cAsset): Tx [`0x3eb479ed...`](https://sepolia.etherscan.io/tx/0x3eb479ed8a58af4e847ec31c08362c120bad799f0c76859c8a2e7fd40334d36d)
   * **Bidder 2** (Dapat 50k cAsset): Tx [`0xc9f49a2c...`](https://sepolia.etherscan.io/tx/0xc9f49a2c46300b4633e2f745a398cbe85bb059021c6176a1c762a456cfd5282d)
   * **Bidder 3** (Dapat 20k cAsset & refund sisa cUSD): Tx [`0x9bdb5961...`](https://sepolia.etherscan.io/tx/0x9bdb5961e930e838e4ecb86dbe66f91f630ee2d45d30d262679722900166223e)
   * **Bidder 4** (Kalah FCFS, refund 100% cUSD): Tx [`0x8aeec773...`](https://sepolia.etherscan.io/tx/0x8aeec7737b46ba95e406c8c95522a753563fe327a6e7aa86791bb8063b66b720)
   * **Bidder 5** (Kalah harga < reserve, refund 100% cUSD): Tx [`0x366d972d...`](https://sepolia.etherscan.io/tx/0x366d972dfe08bcba44d4c09b37ad7d61f1bd30735a471e16665641da8cbf12f1)
7. **`withdrawToSafe`**:
   * Hasil settlement senilai **105,000 cUSD** masuk ke Gnosis Safe.
   * **Tx Hash**: [`0xccdaf2e47e446f60d1b9fb58b764aaddbcead11de2dc809bc24803f2676eb9ef`](https://sepolia.etherscan.io/tx/0xccdaf2e47e446f60d1b9fb58b764aaddbcead11de2dc809bc24803f2676eb9ef)

---

## 5. Kepatuhan Kriteria Pengujian (Automated Testing)

* **Pengujian Lokal (Docker Nox Stack)**: Memiliki 32 unit test otomatis (`hardhat test`) yang mencakup pengujian batas under-funded bid, reserve price gate, oversubscribed allocation, audit grant, dan handle rotation.
* **Coverage**: Seluruh skenario batas (*edge cases*) teruji 100% lulus.

---

## 6. Kesimpulan & Status Submisi (Status Submission)

Smart contract layer dari proyek **Nirlipta** telah siap disubmisikan. Seluruh fungsionalitas teknis Nox TEE, ERC-7984, alur lelang, dan integrasi Gnosis Safe telah berhasil diverifikasi dan terbukti berjalan sempurna di jaringan publik **Ethereum Sepolia Testnet**.
