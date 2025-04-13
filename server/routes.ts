import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertListingSchema, insertBidSchema, insertBarterOfferSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        location: user.location,
        phoneNumber: user.phoneNumber,
        role: user.role
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Crop types routes
  app.get("/api/crop-types", async (req, res) => {
    try {
      const cropTypes = await storage.getCropTypes();
      res.json(cropTypes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Listings routes
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getListings();
      
      // Get crop types for each listing
      const cropTypes = await storage.getCropTypes();
      const cropTypeMap = new Map(cropTypes.map(ct => [ct.id, ct]));
      
      // Get user info for each listing
      const userIds = [...new Set(listings.map(l => l.userId))];
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u]));
      
      // Get bids for each listing
      const listingIds = listings.map(l => l.id);
      const allBids = await Promise.all(listingIds.map(id => storage.getBidsByListingId(id)));
      const bidCountMap = new Map(allBids.map((bids, i) => [listingIds[i], bids.length]));
      
      const enrichedListings = listings.map(listing => {
        const cropType = cropTypeMap.get(listing.cropTypeId);
        const user = userMap.get(listing.userId);
        const bidCount = bidCountMap.get(listing.id) || 0;
        
        return {
          ...listing,
          cropType: cropType ? { id: cropType.id, name: cropType.name } : undefined,
          seller: user ? { 
            id: user.id, 
            name: user.name,
            location: user.location 
          } : undefined,
          bidCount
        };
      });
      
      res.json(enrichedListings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      
      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }
      
      const listing = await storage.getListing(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Get crop type
      const cropType = await storage.getCropType(listing.cropTypeId);
      
      // Get seller info
      const seller = await storage.getUser(listing.userId);
      
      // Get bids
      const bids = await storage.getBidsByListingId(listingId);
      
      res.json({
        ...listing,
        cropType: cropType ? { id: cropType.id, name: cropType.name } : undefined,
        seller: seller ? { 
          id: seller.id, 
          name: seller.name,
          location: seller.location 
        } : undefined,
        bidCount: bids.length
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      console.log("Received listing data:", req.body);
      
      const result = insertListingSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        console.error("Validation error:", validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Convert crop type name to ID if provided
      let cropTypeId = result.data.cropTypeId;
      if (!cropTypeId && result.data.cropTypeName) {
        const cropType = await storage.getCropTypeByName(result.data.cropTypeName);
        if (!cropType) {
          return res.status(400).json({ message: "Invalid crop type name" });
        }
        cropTypeId = cropType.id;
      }
      
      // Ensure harvestedDate is a proper Date object
      let harvestedDate;
      try {
        if (typeof result.data.harvestedDate === 'string') {
          harvestedDate = new Date(result.data.harvestedDate);
          if (isNaN(harvestedDate.getTime())) {
            throw new Error("Invalid date");
          }
        } else {
          harvestedDate = result.data.harvestedDate;
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid harvested date format" });
      }
      
      // Create the listing
      const listing = await storage.createListing({
        ...result.data,
        cropTypeId,
        harvestedDate,
      });
      
      res.status(201).json(listing);
    } catch (error: any) {
      console.error("Error creating listing:", error.message);
      res.status(500).json({ message: "Internal server error: " + error.message });
    }
  });

  app.get("/api/users/:userId/listings", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const listings = await storage.getListingsByUserId(userId);
      
      // Get crop types for each listing
      const cropTypes = await storage.getCropTypes();
      const cropTypeMap = new Map(cropTypes.map(ct => [ct.id, ct]));
      
      // Get bids for each listing
      const listingIds = listings.map(l => l.id);
      const allBids = await Promise.all(listingIds.map(id => storage.getBidsByListingId(id)));
      const bidCountMap = new Map(allBids.map((bids, i) => [listingIds[i], bids.length]));
      
      const enrichedListings = listings.map(listing => {
        const cropType = cropTypeMap.get(listing.cropTypeId);
        const bidCount = bidCountMap.get(listing.id) || 0;
        
        return {
          ...listing,
          cropType: cropType ? { id: cropType.id, name: cropType.name } : undefined,
          bidCount
        };
      });
      
      res.json(enrichedListings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bids routes
  app.get("/api/listings/:listingId/bids", async (req, res) => {
    try {
      const listingId = parseInt(req.params.listingId);
      
      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }
      
      const listing = await storage.getListing(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      const bids = await storage.getBidsByListingId(listingId);
      
      // Get user info for each bid
      const userIds = [...new Set(bids.map(b => b.userId))];
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u]));
      
      const enrichedBids = bids.map(bid => {
        const user = userMap.get(bid.userId);
        
        return {
          ...bid,
          user: user ? { 
            id: user.id, 
            name: user.name,
            location: user.location 
          } : undefined
        };
      });
      
      res.json(enrichedBids);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/listings/:listingId/bids", async (req, res) => {
    try {
      const listingId = parseInt(req.params.listingId);
      
      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }
      
      const listing = await storage.getListing(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      const result = insertBidSchema.safeParse({
        ...req.body,
        listingId
      });
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const bid = await storage.createBid(result.data);
      
      res.status(201).json(bid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Price Prediction
  app.post("/api/predict-price", async (req, res) => {
    try {
      const { cropTypeId, cropTypeName, location, quality } = req.body;
      
      let resolvedCropTypeId = cropTypeId;
      
      // Convert crop type name to ID if provided
      if (!resolvedCropTypeId && cropTypeName) {
        const cropType = await storage.getCropTypeByName(cropTypeName);
        if (!cropType) {
          return res.status(400).json({ message: "Invalid crop type name" });
        }
        resolvedCropTypeId = cropType.id;
      }
      
      if (!resolvedCropTypeId || !location || !quality) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const price = await storage.predictPrice(resolvedCropTypeId, location, quality);
      
      // Round to 2 decimal places
      const roundedPrice = Math.round(price * 100) / 100;
      
      // Create a price range (+/- 10%)
      const minPrice = Math.round((roundedPrice * 0.9) * 100) / 100;
      const maxPrice = Math.round((roundedPrice * 1.1) * 100) / 100;
      
      res.json({
        minPrice,
        maxPrice,
        priceRange: `₹${minPrice}-${maxPrice}`,
        averagePrice: roundedPrice,
        marketComparison: (Math.random() > 0.5 ? "above" : "below")
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Crop Demand Forecast
  app.get("/api/forecast", async (req, res) => {
    try {
      const forecastData = await storage.getForecastData();
      res.json(forecastData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Barter System
  app.get("/api/barter-offers", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      if (userId !== undefined && isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      let barterOffers;
      
      if (userId !== undefined) {
        barterOffers = await storage.getBarterOffersByUserId(userId);
      } else {
        barterOffers = await storage.getBarterOffers();
      }
      
      // Get crop types
      const cropTypes = await storage.getCropTypes();
      const cropTypeMap = new Map(cropTypes.map(ct => [ct.id, ct]));
      
      // Get users
      const userIds = [...new Set([
        ...barterOffers.map(o => o.offerUserId),
        ...barterOffers.map(o => o.receiverUserId)
      ])];
      
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u]));
      
      const enrichedOffers = barterOffers.map(offer => {
        const offerUser = userMap.get(offer.offerUserId);
        const receiverUser = userMap.get(offer.receiverUserId);
        const offerCropType = cropTypeMap.get(offer.offerCropTypeId);
        const receiverCropType = cropTypeMap.get(offer.receiverCropTypeId);
        
        return {
          ...offer,
          offerUser: offerUser ? { 
            id: offerUser.id, 
            name: offerUser.name,
            location: offerUser.location 
          } : undefined,
          receiverUser: receiverUser ? { 
            id: receiverUser.id, 
            name: receiverUser.name,
            location: receiverUser.location 
          } : undefined,
          offerCropType: offerCropType ? { id: offerCropType.id, name: offerCropType.name } : undefined,
          receiverCropType: receiverCropType ? { id: receiverCropType.id, name: receiverCropType.name } : undefined
        };
      });
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/barter-offers", async (req, res) => {
    try {
      const result = insertBarterOfferSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const barterOffer = await storage.createBarterOffer(result.data);
      
      res.status(201).json(barterOffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/barter-offers/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid barter offer ID" });
      }
      
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedOffer = await storage.updateBarterOfferStatus(id, status);
      
      if (!updatedOffer) {
        return res.status(404).json({ message: "Barter offer not found" });
      }
      
      res.json(updatedOffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
