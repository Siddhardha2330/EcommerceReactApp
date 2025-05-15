import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const products =[
  {
    "category": "Home Appliances",
    "cost": 2815,
    "createdAt": "1746100010266",
    "details": "wipro Elato Bs302 800 Watt 3-In-1 Detachable Sandwich Maker, Removables Plates For Toaster, Griller & Waffle Maker, Non-Toxic Ceramic Coating,2 Year Warranty, Regular Bread Size For 2 Slices, Black",
    "discount": 41,
    "name": "Wipro",
    "stock": 10,
    "url": "/image47.png"
  },
  {
    "category": "Home Appliances",
    "cost": 6999,
    "createdAt": "1746101010266",
    "details": "Atomberg Zenova Mixer Grinder | Unique Coarse Mode for Silbatta-like Texture | Intelligent BLDC Motor | Safety Features | 4 Jars including Chopper | Hands-Free Operation (Red Wine)",
    "discount": 42,
    "name": "Atomberg",
    "stock": 8,
    "url": "/image48.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1499,
    "createdAt": "1746102010266",
    "details": "NutriPro Juicer Mixer Grinder - Smoothie Maker - 500 Watts (2 Jar, Silver) - 2 Year Warranty",
    "discount": 70,
    "name": "NutriPro",
    "stock": 15,
    "url": "/image49.png"
  },
  {
    "category": "Home Appliances",
    "cost": 2999,
    "createdAt": "1746103010266",
    "details": "Pigeon Healthifry Digital Air Fryer, 360° High Speed Air Circulation Technology 1200 W with Non-Stick 4.2 L Basket - Green",
    "discount": 50,
    "name": "Pigeon",
    "stock": 12,
    "url": "/image50.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1454,
    "createdAt": "1746104010266",
    "details": "Morphy Richards Europa Drip Espresso Coffee Machine For Home|600W Drip Coffee Maker|6-Cups Capacity*|Anti-Drip Function|Dry Heat Protection|Warming Plate|2-Yr Warranty By Brand|Black",
    "discount": 53,
    "name": "Morphy Richards",
    "stock": 7,
    "url": "/image51.png"
  },
  {
    "category": "Home Appliances",
    "cost": 3829,
    "createdAt": "1746105010266",
    "details": "Wipro Elato FMG208 800 Watt Mixer Grinder with 3 Jars,Heavy Duty 100% Copper Ball Bearing Motor with 5 Year Warranty,Superfast Grinding,Clip Lids - Hands Free use, 3 Jars Mixer Grinder 800 Watt,Black",
    "discount": 81,
    "name": "Wipro Elato",
    "stock": 6,
    "url": "/image52.png"
  },
  {
    "category": "Home Appliances",
    "cost": 7999,
    "createdAt": "1746106010266",
    "details": "KENT Digital Air Fryer Oven 12L | 1800W | 360° Rapid Heat Circulation | 10 Preset Menus | Bake, Grill & Roast | Digital Display & Touch Control Panel | Dehydration & Rotisserie Function",
    "discount": 33,
    "name": "KENT",
    "stock": 5,
    "url": "/image53.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1150,
    "createdAt": "1746107010266",
    "details": "RFV1 3-in-1 Premium Gift Set: Electric Kettle 1.8L + Thermo Vacuum Flask (500ML) + 3 Coffee Mugs - Stainless Steel, Insulated for Hot and Cold Drinks - Ideal for Travel, Home Use, and Diwali Gifting",
    "discount": 56,
    "name": "RFV1",
    "stock": 10,
    "url": "/image54.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1062,
    "createdAt": "1746108010266",
    "details": "Scotch-Brite 2-in-1 Bucket Spin Mop (Green, 2 Refills), 4 Pcs",
    "discount": 41,
    "name": "Scotch-Brite",
    "stock": 20,
    "url": "/image55.png"
  },
  {
    "category": "Home Appliances",
    "cost": 79,
    "createdAt": "1746109010266",
    "details": "GANESH Stainless Steel Potato Crusher Vegetable Smasher Pav Bhaji Masher with Handle for Effortless Kitchen Uses (Pack of 1, Assorted)",
    "discount": 28,
    "name": "GANESH",
    "stock": 30,
    "url": "/image56.png"
  },
  {
    "category": "Home Appliances",
    "cost": 75,
    "createdAt": "1746110010266",
    "details": "Clazkit Multi-Purpose Heavy Duty Stand Home Appliance Refrigerator/Washing Machine/Furniture/Fridge Stand, Round, Blue (Pack of 4)",
    "discount": 50,
    "name": "Clazkit",
    "stock": 18,
    "url": "/image57.png"
  },
  {
    "category": "Home Appliances",
    "cost": 205,
    "createdAt": "1746111010266",
    "details": "Atom 10Kg Kitchen Weight Machine 6 Months Warranty, Digital Scale with LCD Display, Scale for Home Baking, Cooking & Balance Diet. Weighing Machine with capacity 10Kg, SF400/A121,Color May Vary",
    "discount": 66,
    "name": "Atom",
    "stock": 25,
    "url": "/image58.png"
  },
  {
    "category": "Home Appliances",
    "cost": 949,
    "createdAt": "1746112010266",
    "details": "Milton Ernesto Inner Stainless Steel Jr. Casserole Set of 3 (420 ml, 850 ml, 1.43 litres), Red | Easy to Carry | Serving | Stackable",
    "discount": 68,
    "name": "Milton",
    "stock": 14,
    "url": "/image59.png"
  },
  {
    "category": "Home Appliances",
    "cost": 2498,
    "createdAt": "1746113010266",
    "details": "Lifelong Home Safe Locker with Key for Home, 8.6 Litre Capacity, 3 Live Bolts, 5mm Sturdy Metal Door (LLHSM01, Black)",
    "discount": 58,
    "name": "Lifelong",
    "stock": 6,
    "url": "/image60.png"
  },
  {
    "category": "Home Appliances",
    "cost": 899,
    "createdAt": "1746114010266",
    "details": "Pigeon 2 Slice Auto Pop up Toaster. A Smart Bread Toaster for Your Home (750 Watt) (Black)",
    "discount": 50,
    "name": "Pigeon Toaster",
    "stock": 10,
    "url": "/image61.png"
  },
  {
    "category": "Home Appliances",
    "cost": 389,
    "createdAt": "1746115010266",
    "details": "Seznik Portable Mini Sealing Machine, Handheld Packet Sealer for Food, Snacks, Chips, Fresh Storage, Plastic Bags Sealing Machine, 1 YEAR Warranty (White)",
    "discount": 68,
    "name": "Seznik",
    "stock": 20,
    "url": "/image62.png"
  },
  {
    "category": "Home Appliances",
    "cost": 95,
    "createdAt": "1746116010266",
    "details": "Ganesh Plastic Vegetable Slicer Cutter, Black",
    "discount": 28,
    "name": "Ganesh",
    "stock": 30,
    "url": "/image63.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1899,
    "createdAt": "1746117010266",
    "details": "AGARO Marvel 9 Litre OTG, With Auto Shut-off, Timer Control, Heat Resistant Tempered Glass, Oven Toaster Griller for Cake Baking, Grilling, Toasting, OTG 800W (Black)",
    "discount": 32,
    "name": "AGARO",
    "stock": 8,
    "url": "/image64.png"
  },
  {
    "category": "Home Appliances",
    "cost": 2049,
    "createdAt": "1746118010266",
    "details": "Cookwell Bullet Mixer Grinder (5 Jars, 3 Blades, Silver) - Copper, 600 Watts - 2 Year Warranty",
    "discount": 66,
    "name": "Cookwell",
    "stock": 12,
    "url": "/image65.png"
  },
  {
    "category": "Home Appliances",
    "cost": 1649,
    "createdAt": "1746119010266",
    "details": "PHILIPS Citrus Press Juicer HR2799/00, Black & Transparent, Large",
    "discount": 13,
    "name": "PHILIPS",
    "stock": 10,
    "url": "/image66.png"
  }
];

async function insertProducts() {
  for (const product of products) {
    try {
      await addDoc(collection(db, 'products'), product);
      console.log(`Inserted: ${product.name}`);
    } catch (error) {
      console.error(`Error inserting ${product.name}:`, error);
    }
  }
  console.log('All products inserted. You can now delete this script.');
}

// Only run if this file is executed directly (not imported)
if (import.meta && import.meta.url && import.meta.url.endsWith('insertTempProducts.js')) {
  insertProducts();
} 