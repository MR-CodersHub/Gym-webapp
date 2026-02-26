/**
 * backend.js
 * MOCK Backend to replace Firebase/Supabase with LocalStorage.
 * "Remove all backend works and use only JS for functionalities"
 */

// --- LocalStorage Helper ---
const DB_KEY = 'gym_mock_db';
const AUTH_KEY = 'gym_mock_auth_user';

function loadDB() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) return seedDB();
    return JSON.parse(data);
}

function saveDB(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function seedDB() {
    const today = new Date().toISOString().split('T')[0];
    const initialData = {
        users: {}, // uid -> user data
        contact_messages: [],
        bookings: [],
        trainers: [
            { id: 1, name: 'Axel Stone', specialty: 'Strength' },
            { id: 2, name: 'Blaze Fielding', specialty: 'HIIT' },
            { id: 3, name: 'Adam Hunter', specialty: 'Boxing' }
        ],
        classes: [
            { id: '101', name: 'Iron Forged', type: 'Strength', class_date: today, start_time: '06:00:00', duration_minutes: 60, trainer_id: 1, capacity: 20, available_slots: 15, plan_requirement: 'Basic' },
            { id: '102', name: 'Burn Protocol', type: 'HIIT', class_date: today, start_time: '09:00:00', duration_minutes: 45, trainer_id: 2, capacity: 25, available_slots: 25, plan_requirement: 'Basic' },
            { id: '103', name: 'Knockout', type: 'Cardio', class_date: today, start_time: '18:00:00', duration_minutes: 60, trainer_id: 3, capacity: 15, available_slots: 2, plan_requirement: 'Premium' }
        ],
        payments: []
    };
    saveDB(initialData);
    return initialData;
}

// Ensure DB exists logic
const mockDB = loadDB();


// --- MOCK AUTH ---
let currentUser = JSON.parse(localStorage.getItem(AUTH_KEY));
const authListeners = [];

export const auth = {
    get currentUser() { return currentUser; }
};

function notifyAuth() {
    authListeners.forEach(cb => cb(currentUser));
}

export const onAuthStateChanged = (authInstance, callback) => {
    authListeners.push(callback);
    // Trigger immediately
    callback(currentUser);
    return () => { }; // Unsubscribe mock
};

export const createUserWithEmailAndPassword = async (authInstance, email, password) => {
    // Simulate async
    await new Promise(r => setTimeout(r, 500));
    const uid = 'user_' + Date.now();
    const newUser = { uid, email, displayName: email.split('@')[0], emailVerified: true };

    // Save to users collection in Mock DB
    mockDB.users[uid] = {
        name: newUser.displayName,
        email: email,
        role: 'user',
        membership_status: 'active',
        membership_plan: 'basic'
    };
    saveDB(mockDB);

    currentUser = newUser;
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    notifyAuth();
    return { user: newUser };
};

export const signInWithEmailAndPassword = async (authInstance, email, password) => {
    await new Promise(r => setTimeout(r, 500));
    // Accept any password for mock
    // Find user by email in mockDB users
    let uid = Object.keys(mockDB.users).find(key => mockDB.users[key].email === email);

    // If user doesn't exist in Mock DB, create them (Auto-Registration for Mock convenience)
    if (!uid) {
        uid = 'user_' + Date.now();
        const newUser = {
            name: email.split('@')[0],
            email: email,
            role: (email === 'admin@gym.com' || email === 'admin@gmail.com') ? 'admin' : 'user',
            membership_status: 'active',
            membership_plan: 'basic'
        };
        // Special admin handling
        if (email === 'admin@gym.com' || email === 'admin@gmail.com') {
            newUser.name = 'Admin User';
            uid = 'admin_1';
        }

        mockDB.users[uid] = newUser;
        saveDB(mockDB);
    }
    // If user exists, ensure Admin role is enforced for admin emails (in case created as user before)
    else if (email === 'admin@gym.com' || email === 'admin@gmail.com') {
        if (mockDB.users[uid].role !== 'admin') {
            mockDB.users[uid].role = 'admin';
            mockDB.users[uid].name = 'Admin User';
            saveDB(mockDB);
        }
    }

    const userEntry = mockDB.users[uid];

    currentUser = {
        uid: uid,
        email,
        displayName: userEntry.name
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    notifyAuth();
    return { user: currentUser };
};

export const signOut = async (authInstance) => {
    await new Promise(r => setTimeout(r, 200));
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    notifyAuth();
};

export const updateProfile = async (user, { displayName }) => {
    if (currentUser) {
        currentUser.displayName = displayName;
        localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
        // Update DB too
        if (mockDB.users[currentUser.uid]) {
            mockDB.users[currentUser.uid].name = displayName;
            saveDB(mockDB);
        }
        notifyAuth();
    }
};

export const updatePassword = async () => true;
export const reauthenticateWithCredential = async () => true;
export const EmailAuthProvider = {
    credential: () => ({})
};


// --- MOCK FIRESTORE ---
export const db = {}; // Mock Firestore Instance

export const collection = (db, name) => name;
export const doc = (db, col, id) => ({ col, id });

export const addDoc = async (colName, data) => {
    await new Promise(r => setTimeout(r, 300));
    const id = 'doc_' + Date.now();
    if (!mockDB[colName]) mockDB[colName] = [];

    // Retrieve DB again in case of changes
    const currentDB = loadDB();
    if (!currentDB[colName]) currentDB[colName] = [];

    const newDoc = { id, ...data };

    // Handle specific array vs object structures
    // Users is object (uid -> data), others are arrays
    if (colName === 'users') {
        // Assume users handled via doc/setDoc usually
    } else {
        currentDB[colName].push(newDoc);
    }

    saveDB(currentDB);
    // Update memory
    Object.assign(mockDB, currentDB);

    return { id };
};

export const getDoc = async (docRef) => {
    await new Promise(r => setTimeout(r, 200));
    const currentDB = loadDB();
    // docRef is { col, id }
    // Check if it's 'users'
    if (docRef.col === 'users') {
        const data = currentDB.users[docRef.id];
        return {
            exists: () => !!data,
            data: () => data
        };
    }
    return { exists: () => false };
};

export const setDoc = async (docRef, data) => {
    await new Promise(r => setTimeout(r, 200));
    const currentDB = loadDB();
    if (docRef.col === 'users') {
        currentDB.users[docRef.id] = { ...(currentDB.users[docRef.id] || {}), ...data };
    }
    saveDB(currentDB);
    Object.assign(mockDB, currentDB);
};

export const getDocs = async (queryRef) => {
    // queryRef might be a collection name string OR a query object from query()
    let colName = queryRef;
    if (typeof queryRef === 'object' && queryRef.colName) {
        colName = queryRef.colName;
    }

    const currentDB = loadDB();
    let data = [];

    if (colName === 'users') {
        data = Object.keys(currentDB.users).map(k => ({ id: k, ...currentDB.users[k] }));
    } else {
        data = currentDB[colName] || [];
    }

    // Sort logic is simple mock
    if (queryRef.orderByField) {
        const field = queryRef.orderByField;
        const dir = queryRef.orderDir === 'desc' ? -1 : 1;
        data.sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
    }

    return {
        size: data.length,
        forEach: (cb) => data.forEach(item => cb({ id: item.id, data: () => item })),
        empty: data.length === 0,
        docs: data.map(item => ({ id: item.id, data: () => item }))
    };
};

export const updateDoc = async (docRef, data) => {
    await new Promise(r => setTimeout(r, 200));
    const currentDB = loadDB();
    if (docRef.col === 'users') {
        if (!currentDB.users[docRef.id]) throw new Error('Document does not exist');
        currentDB.users[docRef.id] = { ...currentDB.users[docRef.id], ...data };
    }
    saveDB(currentDB);
    Object.assign(mockDB, currentDB);
};

export const query = (colRef, ...constraints) => {
    // Return a query object
    const q = { colName: colRef };
    constraints.forEach(c => {
        if (c.type === 'orderBy') {
            q.orderByField = c.field;
            q.orderDir = c.dir;
        }
    });
    return q;
};

export const orderBy = (field, dir = 'asc') => ({ type: 'orderBy', field, dir });
export const where = () => ({}); // Ignored in mock


// --- MOCK SUPABASE ---
// Chainable mock
class SupabaseQuery {
    constructor(table) {
        this.table = table;
        this.filters = [];
        this.selectFields = '*';
        this.sorts = [];
        this.limitVal = null;
    }

    select(fields, options) {
        this.selectFields = fields;
        if (options && options.count) this.countMode = true;
        return this;
    }

    eq(column, value) {
        this.filters.push({ column, value, op: 'eq' });
        return this;
    }

    gt(column, value) {
        this.filters.push({ column, value, op: 'gt' });
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.sorts.push({ column, ascending });
        return this;
    }

    async then(resolve, reject) {
        // Execute Query against MockDB
        await new Promise(r => setTimeout(r, 200));
        const currentDB = loadDB();
        let data = currentDB[this.table] || [];

        // Apply filters
        this.filters.forEach(f => {
            if (f.op === 'eq') data = data.filter(d => d[f.column] == f.value);
            if (f.op === 'gt') data = data.filter(d => d[f.column] > f.value);
        });

        // Apply Sorts
        this.sorts.forEach(s => {
            data.sort((a, b) => {
                const valA = a[s.column];
                const valB = b[s.column];
                if (valA < valB) return s.ascending ? -1 : 1;
                if (valA > valB) return s.ascending ? 1 : -1;
                return 0;
            });
        });

        // Joins (Very basic mock for 'trainers (name)')
        if (this.selectFields.includes('trainers') && this.table === 'classes') {
            data = data.map(item => {
                const trainer = currentDB.trainers.find(t => t.id == item.trainer_id);
                return { ...item, trainers: trainer || { name: 'Unknown' } };
            });
        }

        // Classes inside Bookings?
        if (this.selectFields.includes('classes') && this.table === 'bookings') {
            // bookings has class_id
            data = data.map(b => {
                const cls = currentDB.classes.find(c => c.id == b.class_id);
                return { ...b, classes: cls || {} };
            });
        }

        // Return result
        const result = { data: data, error: null };
        if (this.countMode) result.count = data.length;

        resolve(result);
    }

    // Support direct insert/update via Supabase syntax
    async insert(rows) {
        const currentDB = loadDB();
        if (!currentDB[this.table]) currentDB[this.table] = [];

        rows.forEach(row => {
            currentDB[this.table].push({ id: Date.now() + Math.random(), ...row });
        });
        saveDB(currentDB);
        Object.assign(mockDB, currentDB);
        return { error: null };
    }
}

export const supabase = {
    from: (table) => new SupabaseQuery(table)
};
