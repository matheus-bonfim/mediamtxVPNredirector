import Docker from 'dockerode';
import { createYml, getPorts } from './functions.js';
import fs, { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { __dirname, IP } from './config.js';


export const ports_path = './ports.json';
export const con_config_path = './containers_config';


const docker = new Docker(); // Conectar com o Docker local

export async function getAllContainers(agingTime){
  const time = Date.now() 
  try{
    let containers = await docker.listContainers({ all: true });
    for (let container of containers){
      let conObj = docker.getContainer(container.Id);
      let data = await conObj.inspect();
      let conName = data.Name.replace('/', '');
      if (container.State !== 'running'){
        await removeStream(conName);
      }
      else{
        let timestamp = new Date(data.Created).getTime();
        if (time - timestamp > agingTime){
          await removeStream(conName);
        }
      }
    }
  }
  catch (error) {
    console.log(error);
  }
}
// Função para verificar se o container já está rodando
async function checkContainerRunning(containerName) {
  try {
    let containers = await docker.listContainers({ all: false }); // so containers ativos
    let container = containers.some(container => container.Names.includes('/' + containerName));
    if(container){
        const ports_j = JSON.parse(fs.readFileSync(ports_path, 'utf-8'));
        
        return ports_j[containerName];
    }
    else{
        containers = await docker.listContainers({ all: true});
        const idle_cont = containers.filter(c => c.State !== 'running');
        for (let c of idle_cont){
            let con = docker.getContainer(c.Id);
            await con.remove({force: true});
            console.log(`Removido: ${c.Names[0]} (ID: ${c.Id})`);
        }
        return false; 
    }
  
  } catch (err) {
    console.error('Erro ao listar containers: ', err);
    return false;
  }
}

// Função para criar e iniciar um novo container
async function createAndStartContainer(containerName, ip, tipo) {

    const ports = await getPorts();
    if(ports){
      const file_yml = createYml(containerName, ip, ports, tipo);
      if (file_yml){
          try {
              const container = await docker.createContainer({
                Image: 'bluenviron/mediamtx', // A imagem do MediaMTX
                name: containerName,
                HostConfig: {
                  NetworkMode: 'host', // Usar a rede do host
                  Binds: [
                    `${__dirname}/containers_config/${containerName}.yml:/mediamtx.yml`, // Montando o arquivo de configuração
                  ],
                },
              });
          
              await container.start(); // Iniciar o container
              console.log(`Container ${containerName} criado e iniciado com sucesso!`);
              const ports_j = JSON.parse(readFileSync(ports_path, 'utf-8'));
              ports_j[containerName] = ports;
              writeFileSync(ports_path, JSON.stringify(ports_j, null, 2)); 
              console.log(ports);

              const url_rtsp = `rtsp://${IP}:${ports.rtspAddress}/${containerName};`


              return ports;

            } catch (err) {
              console.error('Erro ao criar o container:', err);
            }
      }
      else{
          console.log("Sem arquivo para configurar container")
      }
    }
    else{
      console.log("Sem portas disponíveis")
    }
}

// Função principal que gerencia a criação do container quando solicitado
export async function handleRequest(containerName, ip, tipo) { //retorna as portas ou undefined em caso de erro
  console.log("container name:",containerName);
  console.log("ip ", ip);
  // Verificar se o container já está rodando
  const ports = await checkContainerRunning(containerName); // se tiver rodando, retorna as portas, else retorna false
  if (!ports) {
    console.log(`Iniciando container para a câmera ${ip}`);
    return await createAndStartContainer(containerName, ip, tipo);
  } else {
    console.log(`Container para a câmera ${containerName} já está rodando.`);
    console.log(ports);
    return ports;
  }
}

export async function removeStream(cam){
    fs.unlink(path.join(con_config_path, `${cam}.yml`), (err) => {
        if (err) console.log("Arquivo não encontrado");
        else console.log(`Arquivo ${cam}.yml deletado`);
    });
    const ports_j = JSON.parse(readFileSync(ports_path, 'utf-8'));
    try {
        delete ports_j[cam];
        writeFileSync(ports_path, JSON.stringify(ports_j, null, 2));
    }
    catch (err) {
        console.log(`${cam} não está em ports.json`);
    }
    const containers = await docker.listContainers({ all: true});
    const container_info = containers.find(c => 
        c.Names.some(name => name.replace(/^\//, '') === cam)
    );
    if(container_info){
        const container = docker.getContainer(container_info.Id);
        await container.remove({force: true});
        console.log(`container ${cam} removido`);
    }
    else{
        console.log("Container nao encontrado!")
    }
}

export async function listActiveContainers(){
  const containers = await docker.listContainers({ all: false }); // so containers ativos
  const conNames = containers.map(con => con.Names[0].replace(/^\//, ''));
  return conNames;
}
//handleRequest('cam1', '172.16.0.181:554')

//removeStream('43.3_CXT')
//removeStream('ch2')


//createAndStartContainer('7.3_LPR', '192.168.2.23', 'LPR');



//'192.168.24.29:554'
// Teste: ao chamar essa função, um container será criado se a câmera não estiver sendo transmitida
//handleRequest('cam3', '192.168.24.29:554');    portao do parque 
//handleRequest('cam2', '192.168.24.37:554');
//handleRequest('cam4', '172.16.0.180:554')

//handleRequest('cam4', '172.16.0.180:554')

//handleRequest('cam1', '172.16.0.181:554');



///preciso fazer um gerenciador de containers ativosossssosossososososososos


//rtsp://admin:Wnidobrasil%2322@192.168.10.226:8554/cam/realmonitor?channel=1&subtype=1