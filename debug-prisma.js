const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
    console.log('--- Testing Standard Connection ---');
    try {
        const count = await prisma.user.count();
        console.log('Successfully connected! User count:', count);
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
