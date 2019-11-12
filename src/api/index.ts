//MOCK 
// TODO: Implement

export const Api ={
    ens : {},
    ipfs: {
        deploy:(folder:any)=>{return true},
        confirmDeploy:(hash: string)=>{return true},
        zip:{
            hash:()=>{return "0xDEADBEEF"},
            compress:()=>{return true}
        }
    }
}

export default Api