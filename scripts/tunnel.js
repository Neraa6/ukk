const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ngrok = require('ngrok');

const envPath = path.join(__dirname, '../.env');
const port = 3000;

async function start() {
  console.log('\n=== Memulai Terowongan ngrok ===');
  try {
    // 1. Jalankan ngrok tunnel
    const url = await ngrok.connect({
      proto: 'http',
      addr: port,
    });
    console.log('\n============================================================');
    console.log(` TEROWONGAN NGROK AKTIF: ${url}`);
    console.log('============================================================\n');

    // 2. Baca dan perbarui APP_URL di berkas .env
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Regex untuk mengganti APP_URL
      const appUrlRegex = /APP_URL\s*=\s*["']?[^"'\r\n]*["']?/g;
      
      if (appUrlRegex.test(envContent)) {
        envContent = envContent.replace(appUrlRegex, `APP_URL="${url}"`);
      } else {
        envContent += `\nAPP_URL="${url}"`;
      }
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`[INFO] Berhasil memperbarui APP_URL di .env menjadi: ${url}\n`);
    } else {
      fs.writeFileSync(envPath, `APP_URL="${url}"\n`, 'utf8');
      console.log(`[INFO] Membuat berkas .env baru dengan APP_URL: ${url}\n`);
    }

    // 3. Jalankan server Next.js development
    console.log('Memulai server pengembangan Next.js...');
    const devServer = spawn('npx', ['next', 'dev'], {
      stdio: 'inherit',
      shell: true,
    });

    // Menangani pembersihan koneksi secara anggun saat keluar
    const cleanup = async () => {
      console.log('\n[INFO] Menutup terowongan ngrok dan mematikan server dev...');
      try {
        await ngrok.disconnect();
        await ngrok.kill();
      } catch (e) {
        // ignore disconnect failures on exit
      }
      devServer.kill('SIGINT');
      process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    devServer.on('exit', (code) => {
      console.log(`[INFO] Server dev berhenti dengan kode keluar ${code}`);
      cleanup();
    });

  } catch (error) {
    console.error('\n[ERROR] Gagal menjalankan terowongan ngrok:', error.message || error);
    console.log('\n=== Tips Penyelesaian Masalah ===');
    console.log('1. Pastikan Anda telah mendaftar akun ngrok gratis di https://ngrok.com');
    console.log('2. Setel token autentikasi ngrok Anda di komputer ini dengan menjalankan:');
    console.log('   npx ngrok config add-authtoken <TOKEN_AUTENTIKASI_ANDA>');
    console.log('3. Setelah token disetel, coba jalankan kembali skrip ini.\n');
    process.exit(1);
  }
}

start();
