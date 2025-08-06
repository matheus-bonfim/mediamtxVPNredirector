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

export async function deleteOlderContainer(){ 
  try{
    let containers = await docker.listContainers({ all: true });
    console.log("Containers: ", containers);
    let prev_container_info = {name: '', timestamp: 0};
    for (let container of containers){
      let conObj = docker.getContainer(container.Id);
      let data = await conObj.inspect();
      let conName = data.Name.replace('/', '');
      if (container.State !== 'running'){
        await removeStream(conName);
      }
      else{
        let timestamp = new Date(data.Created).getTime();
        console.log(prev_container_info)
        if (timestamp > prev_container_info.timestamp){
          prev_container_info.name = conName;
          prev_container_info.timestamp = timestamp;
        }
      }
    }
    await removeStream(prev_container_info.name);
    return true;
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
      console.log("Sem portas disponíveis");
      console.log("Removendo container antigo");
      const deleted = await deleteOlderContainer();
      if(deleted){
        return await createAndStartContainer(containerName, ip, tipo);
      }
      else{
        console.log("Erro ao deletar container antigo");
        return undefined;
      }
}};

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
};

//getAllContainers(10);