import Redis from "ioredis";

const redis = new Redis({
    host : "redis-17924.crce179.ap-south-1-1.ec2.redns.redis-cloud.com",
    port  : 17924,
    password : "XSFmdGSPZwzS5zUkEsW6dXsd2AlHaLnm"
}) ;

export default redis;