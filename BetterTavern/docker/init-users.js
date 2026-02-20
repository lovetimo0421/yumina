/**
 * BetterTavern User Initialization Script
 * Creates default users on first startup when ST_ENABLE_ACCOUNTS=true
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import storage from 'node-persist';

// Use same data path as SillyTavern - ./data in Docker
const DATA_ROOT = './data';
const STORAGE_DIR = path.join(DATA_ROOT, '_storage');
const KEY_PREFIX = 'user:';

// Pre-configured users (password = username)
const INITIAL_USERS = [
    { handle: 'timo', name: 'Timo', admin: true },
    { handle: 'kuaile', name: 'Kuaile', admin: false },
    { handle: 'angotine', name: 'Angotine', admin: false },
    { handle: 'gorgy', name: 'Gorgy', admin: false },
    { handle: 'cym1027', name: 'Cym1027', admin: false },
    { handle: 'james', name: 'James', admin: false },
    { handle: 'beibei', name: 'Beibei', admin: false },
    { handle: 'biglaw', name: 'Biglaw', admin: false },
    { handle: 'makebi', name: 'Makebi', admin: false },
    { handle: 'cyrus', name: 'Cyrus', admin: false },
    { handle: 'daxiaolian', name: 'Daxiaolian', admin: false },
    { handle: 'daisyness', name: 'Daisyness', admin: false },
    { handle: 'ego1st', name: 'Ego1st', admin: false },
    { handle: 'el', name: 'El', admin: false },
    { handle: 'mikegong', name: 'Mikegong', admin: false },
    { handle: 'gui', name: 'Gui', admin: false },
    { handle: 'wangxing', name: 'Wangxing', admin: false },
    { handle: 'molang18', name: 'Molang18', admin: false },
    { handle: 'mcqueen', name: 'Mcqueen', admin: false },
    { handle: 'huiguang', name: 'Huiguang', admin: false },
    { handle: 'hunter', name: 'Hunter', admin: false },
    { handle: 'jerry', name: 'Jerry', admin: false },
    { handle: 'jibamao', name: 'Jibamao', admin: false },
    { handle: 'peip', name: 'Peip', admin: false },
    { handle: 'kassio', name: 'Kassio', admin: false },
    { handle: 'lapy', name: 'Lapy', admin: false },
    { handle: 'loka', name: 'Loka', admin: false },
    { handle: 'milkbed', name: 'Milkbed', admin: false },
    { handle: 'naibao', name: 'Naibao', admin: false },
    { handle: 'pbhe', name: 'Pbhe', admin: false },
    { handle: 'raymond', name: 'Raymond', admin: false },
    { handle: 'renmin', name: 'Renmin', admin: false },
    { handle: 'ronald', name: 'Ronald', admin: false },
    { handle: 'ryanzhu', name: 'Ryanzhu', admin: false },
    { handle: 'andymai', name: 'Andymai', admin: false },
    { handle: 'sword', name: 'Sword', admin: false },
    { handle: 'thomson', name: 'Thomson', admin: false },
    { handle: 'weston', name: 'Weston', admin: false },
    { handle: 'ztr', name: 'Ztr', admin: false },
    { handle: 'xiaoxiao', name: 'Xiaoxiao', admin: false },
    { handle: 'thonyant', name: 'Thonyant', admin: false },
    { handle: 'zonking', name: 'Zonking', admin: false },
    { handle: 'natsui', name: 'Natsui', admin: false },
    { handle: 'gxh', name: 'Gxh', admin: false },
    { handle: 'yuanlin', name: 'Yuanlin', admin: false },
    { handle: 'mom', name: 'Mom', admin: false },
    { handle: 'dad', name: 'Dad', admin: false },
    { handle: 'test1', name: 'Test1', admin: false },
    { handle: 'test2', name: 'Test2', admin: false },
    { handle: 'test3', name: 'Test3', admin: false },
    { handle: 'test4', name: 'Test4', admin: false },
    { handle: 'test5', name: 'Test5', admin: false },
    { handle: 'test6', name: 'Test6', admin: false },
    { handle: 'test7', name: 'Test7', admin: false },
    { handle: 'test8', name: 'Test8', admin: false },
    { handle: 'test9', name: 'Test9', admin: false },
    { handle: 'test10', name: 'Test10', admin: false },
    { handle: 'test11', name: 'Test11', admin: false },
    { handle: 'test12', name: 'Test12', admin: false },
    { handle: 'test13', name: 'Test13', admin: false },
    { handle: 'test14', name: 'Test14', admin: false },
    { handle: 'test15', name: 'Test15', admin: false },
    { handle: 'test16', name: 'Test16', admin: false },
    { handle: 'test17', name: 'Test17', admin: false },
    { handle: 'test18', name: 'Test18', admin: false },
    { handle: 'test19', name: 'Test19', admin: false },
    { handle: 'test20', name: 'Test20', admin: false },
    { handle: 'test21', name: 'Test21', admin: false },
    { handle: 'test22', name: 'Test22', admin: false },
    { handle: 'test23', name: 'Test23', admin: false },
    { handle: 'test24', name: 'Test24', admin: false },
    { handle: 'test25', name: 'Test25', admin: false },
    { handle: 'test26', name: 'Test26', admin: false },
    { handle: 'test27', name: 'Test27', admin: false },
    { handle: 'test28', name: 'Test28', admin: false },
    { handle: 'test29', name: 'Test29', admin: false },
    { handle: 'test30', name: 'Test30', admin: false },
    { handle: 'drowncat', name: 'Drowncat', admin: false },
    { handle: 'gege', name: 'Gege', admin: false },
    { handle: 'wwj', name: 'Wwj', admin: false },
];

function getPasswordSalt() {
    return crypto.randomBytes(16).toString('base64');
}

function getPasswordHash(password, salt) {
    return crypto.scryptSync(password.normalize(), salt, 64).toString('base64');
}

function toKey(handle) {
    return `${KEY_PREFIX}${handle}`;
}

async function initUsers() {
    console.log('======================================');
    console.log('BetterTavern: User Initialization');
    console.log('======================================');
    console.log('Data root:', path.resolve(DATA_ROOT));
    console.log('Storage dir:', path.resolve(STORAGE_DIR));

    // Ensure directories exist
    if (!fs.existsSync(DATA_ROOT)) {
        console.log('Creating data directory...');
        fs.mkdirSync(DATA_ROOT, { recursive: true });
    }

    if (!fs.existsSync(STORAGE_DIR)) {
        console.log('Creating storage directory...');
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    // Initialize node-persist storage
    await storage.init({
        dir: STORAGE_DIR,
        ttl: false,
        expiredInterval: 0,
    });

    console.log('Storage initialized.');

    // Get existing users
    const existingKeys = await storage.keys();
    console.log('Existing storage keys:', existingKeys);

    const existingUserKeys = existingKeys.filter(k => k.startsWith(KEY_PREFIX));
    console.log('Existing user keys:', existingUserKeys);

    // Check if our users already exist
    const ourUserKeys = INITIAL_USERS.map(u => toKey(u.handle));
    const allUsersExist = ourUserKeys.every(key => existingUserKeys.includes(key));

    if (allUsersExist) {
        console.log('All BetterTavern users already exist. Skipping initialization.');
        console.log('======================================');
        return;
    }

    console.log('Creating BetterTavern users...');

    // Find users that need to be created
    const usersToCreate = [];
    for (const userData of INITIAL_USERS) {
        const key = toKey(userData.handle);
        const existingUser = await storage.getItem(key);
        if (existingUser) {
            console.log(`  User "${userData.handle}" already exists, skipping.`);
        } else {
            usersToCreate.push(userData);
        }
    }

    // Create users in parallel batches for speed
    const BATCH_SIZE = 10;
    for (let i = 0; i < usersToCreate.length; i += BATCH_SIZE) {
        const batch = usersToCreate.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (userData) => {
            const key = toKey(userData.handle);
            const salt = getPasswordSalt();
            const password = getPasswordHash(userData.handle, salt);

            const user = {
                handle: userData.handle,
                name: userData.name,
                created: Date.now(),
                password: password,
                salt: salt,
                admin: userData.admin || false,
                enabled: true,
            };

            await storage.setItem(key, user);
            console.log(`  Created user: ${userData.handle} (admin: ${userData.admin})`);
        }));
    }

    console.log(`  Created ${usersToCreate.length} new users.`);

    console.log('======================================');
    console.log('BetterTavern: User initialization complete!');
    console.log(`  Accounts: ${INITIAL_USERS.length} users (timo is admin)`);
    console.log('  Passwords: same as username');
    console.log('======================================');
}

// Run initialization
initUsers()
    .then(() => {
        console.log('Init script finished successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('======================================');
        console.error('BetterTavern: User initialization FAILED!');
        console.error(err);
        console.error('======================================');
        process.exit(1);
    });
