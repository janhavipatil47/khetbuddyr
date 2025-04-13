import { 
  users, User, InsertUser, 
  cropTypes, CropType, InsertCropType,
  listings, Listing, 
  bids, Bid, InsertBid,
  barterOffers, BarterOffer, InsertBarterOffer,
  priceHistory, PriceHistory, InsertPriceHistory
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Crop type operations
  getCropTypes(): Promise<CropType[]>;
  getCropType(id: number): Promise<CropType | undefined>;
  getCropTypeByName(name: string): Promise<CropType | undefined>;
  createCropType(cropType: InsertCropType): Promise<CropType>;
  
  // Listing operations
  getListings(): Promise<Listing[]>;
  getListing(id: number): Promise<Listing | undefined>;
  getListingsByUserId(userId: number): Promise<Listing[]>;
  createListing(listing: any): Promise<Listing>;
  updateListing(id: number, listing: Partial<Listing>): Promise<Listing | undefined>;
  
  // Bid operations
  getBids(): Promise<Bid[]>;
  getBid(id: number): Promise<Bid | undefined>;
  getBidsByListingId(listingId: number): Promise<Bid[]>;
  getBidsByUserId(userId: number): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBidStatus(id: number, status: string): Promise<Bid | undefined>;
  
  // Barter offer operations
  getBarterOffers(): Promise<BarterOffer[]>;
  getBarterOffer(id: number): Promise<BarterOffer | undefined>;
  getBarterOffersByUserId(userId: number): Promise<BarterOffer[]>;
  createBarterOffer(barterOffer: InsertBarterOffer): Promise<BarterOffer>;
  updateBarterOfferStatus(id: number, status: string): Promise<BarterOffer | undefined>;
  
  // Price history operations
  getPriceHistory(): Promise<PriceHistory[]>;
  getPriceHistoryByCropTypeAndLocation(cropTypeId: number, location: string): Promise<PriceHistory[]>;
  createPriceHistory(priceHistory: InsertPriceHistory): Promise<PriceHistory>;
  
  // AI predictions
  predictPrice(cropTypeId: number, location: string, quality: string): Promise<number>;
  getForecastData(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cropTypes: Map<number, CropType>;
  private listings: Map<number, Listing>;
  private bids: Map<number, Bid>;
  private barterOffers: Map<number, BarterOffer>;
  private priceHistory: Map<number, PriceHistory>;
  
  private userId: number;
  private cropTypeId: number;
  private listingId: number;
  private bidId: number;
  private barterOfferId: number;
  private priceHistoryId: number;
  
  public sessionStore: session.Store;
  
  constructor() {
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.cropTypes = new Map();
    this.listings = new Map();
    this.bids = new Map();
    this.barterOffers = new Map();
    this.priceHistory = new Map();
    
    this.userId = 1;
    this.cropTypeId = 1;
    this.listingId = 1;
    this.bidId = 1;
    this.barterOfferId = 1;
    this.priceHistoryId = 1;
    
    // Initialize with sample data
    this.initSampleData();
  }
  
  private initSampleData() {
    // Create sample crop types
    const cropTypes = [
      { name: "Rice" },
      { name: "Wheat" },
      { name: "Tomato" },
      { name: "Potato" },
      { name: "Onion" },
      { name: "Green Chillies" },
      { name: "Eggplant" },
      { name: "Cauliflower" },
      { name: "Cabbage" },
      { name: "Carrots" }
    ];
    
    cropTypes.forEach(cropType => this.createCropType(cropType));
    
    // Create sample users
    const users = [
      { username: "farmer1", password: "password", name: "Rajesh Kumar", location: "Nashik", phoneNumber: "+911234567890", role: "farmer" },
      { username: "farmer2", password: "password", name: "Anita Singh", location: "Pune", phoneNumber: "+911234567891", role: "farmer" },
      { username: "farmer3", password: "password", name: "Suresh Kumar", location: "Nagpur", phoneNumber: "+911234567892", role: "farmer" },
      { username: "buyer1", password: "password", name: "Mohan Patel", location: "Mumbai", phoneNumber: "+911234567893", role: "buyer" }
    ];
    
    users.forEach(user => this.createUser(user));
    
    // Create sample listings
    const listings = [
      { 
        userId: 1, 
        cropTypeId: 1, 
        quantity: 100, 
        price: 42, 
        quality: "A", 
        description: "Premium Basmati Rice", 
        location: "Nashik", 
        harvestedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        deliveryAvailable: true, 
        deliveryRadius: 50, 
        isVerified: true,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e8ac"
      },
      { 
        userId: 2, 
        cropTypeId: 3, 
        quantity: 50, 
        price: 25, 
        quality: "A", 
        description: "Fresh Tomatoes", 
        location: "Pune", 
        harvestedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        deliveryAvailable: true, 
        deliveryRadius: 30, 
        isVerified: true,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655"
      },
      { 
        userId: 3, 
        cropTypeId: 2, 
        quantity: 200, 
        price: 32, 
        quality: "B", 
        description: "Organic Wheat", 
        location: "Nagpur", 
        harvestedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
        deliveryAvailable: false, 
        isVerified: true,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510"
      }
    ];
    
    listings.forEach(listing => this.createListing(listing));
    
    // Create price history
    const locations = ["Pune", "Nashik", "Nagpur", "Mumbai", "Ahmednagar"];
    const qualities = ["A", "B", "C"];
    
    // For each crop type
    for (let i = 1; i <= cropTypes.length; i++) {
      // For each location
      locations.forEach(location => {
        // For each quality
        qualities.forEach(quality => {
          // Create price entries for the last 6 months
          for (let month = 0; month < 6; month++) {
            const date = new Date();
            date.setMonth(date.getMonth() - month);
            
            // Base price depends on crop type, quality, and randomness
            let basePrice = 15 + (i * 2) + (quality === "A" ? 10 : quality === "B" ? 5 : 0);
            
            // Add some randomness
            basePrice = basePrice + (Math.random() * 10 - 5);
            
            // Ensure price is always positive
            basePrice = Math.max(5, basePrice);
            
            this.createPriceHistory({
              cropTypeId: i,
              location,
              price: basePrice,
              quality,
              recordedDate: date
            });
          }
        });
      });
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Crop type operations
  async getCropTypes(): Promise<CropType[]> {
    return Array.from(this.cropTypes.values());
  }
  
  async getCropType(id: number): Promise<CropType | undefined> {
    return this.cropTypes.get(id);
  }
  
  async getCropTypeByName(name: string): Promise<CropType | undefined> {
    for (const cropType of this.cropTypes.values()) {
      if (cropType.name.toLowerCase() === name.toLowerCase()) {
        return cropType;
      }
    }
    return undefined;
  }
  
  async createCropType(cropType: InsertCropType): Promise<CropType> {
    const id = this.cropTypeId++;
    const newCropType = { ...cropType, id };
    this.cropTypes.set(id, newCropType);
    return newCropType;
  }
  
  // Listing operations
  async getListings(): Promise<Listing[]> {
    return Array.from(this.listings.values());
  }
  
  async getListing(id: number): Promise<Listing | undefined> {
    return this.listings.get(id);
  }
  
  async getListingsByUserId(userId: number): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(listing => listing.userId === userId);
  }
  
  async createListing(listing: any): Promise<Listing> {
    const id = this.listingId++;
    const newListing = { 
      ...listing, 
      id, 
      createdAt: new Date() 
    };
    this.listings.set(id, newListing);
    return newListing;
  }
  
  async updateListing(id: number, listingUpdate: Partial<Listing>): Promise<Listing | undefined> {
    const listing = this.listings.get(id);
    if (!listing) return undefined;
    
    const updatedListing = { ...listing, ...listingUpdate };
    this.listings.set(id, updatedListing);
    return updatedListing;
  }
  
  // Bid operations
  async getBids(): Promise<Bid[]> {
    return Array.from(this.bids.values());
  }
  
  async getBid(id: number): Promise<Bid | undefined> {
    return this.bids.get(id);
  }
  
  async getBidsByListingId(listingId: number): Promise<Bid[]> {
    return Array.from(this.bids.values()).filter(bid => bid.listingId === listingId);
  }
  
  async getBidsByUserId(userId: number): Promise<Bid[]> {
    return Array.from(this.bids.values()).filter(bid => bid.userId === userId);
  }
  
  async createBid(bid: InsertBid): Promise<Bid> {
    const id = this.bidId++;
    const newBid = { 
      ...bid, 
      id, 
      createdAt: new Date(),
      status: "pending"
    };
    this.bids.set(id, newBid);
    return newBid;
  }
  
  async updateBidStatus(id: number, status: string): Promise<Bid | undefined> {
    const bid = this.bids.get(id);
    if (!bid) return undefined;
    
    const updatedBid = { ...bid, status };
    this.bids.set(id, updatedBid);
    return updatedBid;
  }
  
  // Barter offer operations
  async getBarterOffers(): Promise<BarterOffer[]> {
    return Array.from(this.barterOffers.values());
  }
  
  async getBarterOffer(id: number): Promise<BarterOffer | undefined> {
    return this.barterOffers.get(id);
  }
  
  async getBarterOffersByUserId(userId: number): Promise<BarterOffer[]> {
    return Array.from(this.barterOffers.values()).filter(
      offer => offer.offerUserId === userId || offer.receiverUserId === userId
    );
  }
  
  async createBarterOffer(barterOffer: InsertBarterOffer): Promise<BarterOffer> {
    const id = this.barterOfferId++;
    const newBarterOffer = { 
      ...barterOffer, 
      id, 
      createdAt: new Date(),
      status: "pending"
    };
    this.barterOffers.set(id, newBarterOffer);
    return newBarterOffer;
  }
  
  async updateBarterOfferStatus(id: number, status: string): Promise<BarterOffer | undefined> {
    const barterOffer = this.barterOffers.get(id);
    if (!barterOffer) return undefined;
    
    const updatedBarterOffer = { ...barterOffer, status };
    this.barterOffers.set(id, updatedBarterOffer);
    return updatedBarterOffer;
  }
  
  // Price history operations
  async getPriceHistory(): Promise<PriceHistory[]> {
    return Array.from(this.priceHistory.values());
  }
  
  async getPriceHistoryByCropTypeAndLocation(cropTypeId: number, location: string): Promise<PriceHistory[]> {
    return Array.from(this.priceHistory.values()).filter(
      history => history.cropTypeId === cropTypeId && history.location === location
    );
  }
  
  async createPriceHistory(priceHistoryData: InsertPriceHistory): Promise<PriceHistory> {
    const id = this.priceHistoryId++;
    const newPriceHistory = { 
      ...priceHistoryData, 
      id, 
      recordedDate: priceHistoryData.recordedDate || new Date()
    };
    this.priceHistory.set(id, newPriceHistory);
    return newPriceHistory;
  }
  
  // AI predictions
  async predictPrice(cropTypeId: number, location: string, quality: string): Promise<number> {
    // Get historical prices for this crop type and location
    const history = await this.getPriceHistoryByCropTypeAndLocation(cropTypeId, location);
    
    // Filter by quality
    const qualityHistory = history.filter(h => h.quality === quality);
    
    if (qualityHistory.length === 0) {
      // If no history for this combination, return a default price
      return 20 + (quality === "A" ? 10 : quality === "B" ? 5 : 0);
    }
    
    // Simple prediction: average of recent prices with trend adjustment
    const sortedHistory = qualityHistory.sort((a, b) => 
      new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()
    );
    
    // Get recent prices (last 3 entries)
    const recentPrices = sortedHistory.slice(0, Math.min(3, sortedHistory.length));
    
    // Calculate average recent price
    const avgRecentPrice = recentPrices.reduce((sum, h) => sum + h.price, 0) / recentPrices.length;
    
    // Add a slight random factor to simulate AI prediction variations
    const predictionFactor = 1 + (Math.random() * 0.1 - 0.05); // +/- 5%
    
    return avgRecentPrice * predictionFactor;
  }
  
  async getForecastData(): Promise<any> {
    // Sample forecast data for the next 6 months
    const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    
    // Get top crop types
    const cropTypes = await this.getCropTypes();
    const topCrops = cropTypes.slice(0, 3);
    
    const datasets = topCrops.map(crop => {
      let data;
      
      if (crop.name === "Tomato") {
        data = [30, 45, 60, 70, 65, 55];
      } else if (crop.name === "Rice") {
        data = [50, 55, 52, 50, 48, 45];
      } else if (crop.name === "Onion") {
        data = [20, 25, 40, 50, 65, 70];
      } else {
        // Generate some random forecast data for other crops
        data = months.map(() => Math.floor(Math.random() * 50) + 20);
      }
      
      return {
        cropId: crop.id,
        cropName: crop.name,
        data
      };
    });
    
    // Group crops by demand level
    const highDemandCrops = ["Green Chillies", "Tomato", "Eggplant"];
    const moderateDemandCrops = ["Rice", "Onion", "Cauliflower"];
    const lowDemandCrops = ["Potato", "Cabbage", "Carrots"];
    
    return {
      labels: months,
      datasets,
      demandGroups: {
        high: highDemandCrops,
        moderate: moderateDemandCrops,
        low: lowDemandCrops
      }
    };
  }
}

export const storage = new MemStorage();
