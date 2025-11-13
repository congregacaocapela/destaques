// Este script serve como o "garçom" que entrega
// os arquivos estáticos do seu [site] bucket.
export default {
  async fetch(request, env, ctx) {
    // Permite que o próprio Cloudflare lide com a entrega dos arquivos
    return env.ASSETS.fetch(request);
  },
};