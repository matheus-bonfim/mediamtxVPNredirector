import dgram from 'dgram';

/**
 * Tenta encontrar uma porta UDP livre dentro de uma faixa.
 * @param {Object} options
 * @param {number[]} options.portRange - Faixa de portas [início, fim].
 * @returns {Promise<number>} - Porta UDP disponível.
 */
export async function getAvailableUdpPort({portRange}) {
  const [start, end] = portRange;

  for (let port = start; port <= end; port++) {
    const isAvailable = await new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      socket.once('error', () => {
        resolve(false); // Porta em uso
      });
      socket.once('listening', () => {
        socket.close();
        resolve(true); // Porta livre
      });
      socket.bind(port);
    });

    if (isAvailable) return port;
  }
  
    console.log("Nenhuma porta disponível")
    return false;  
}

//getAvailableUdpPort({ portRange: [8000, 8020] }).then((p) => console.log(p))