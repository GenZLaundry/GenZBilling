const express = require('express');
const router = express.Router();
const TagHistory = require('../models/TagHistory');

// Get all tag history with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      billNumber,
      customerName,
      customerPhone,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (billNumber) {
      query.billNumber = { $regex: billNumber, $options: 'i' };
    }
    
    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }
    
    if (customerPhone) {
      query.customerPhone = { $regex: customerPhone, $options: 'i' };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [tags, total] = await Promise.all([
      TagHistory.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      TagHistory.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tags,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tag history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tag history',
      error: error.message
    });
  }
});

// Get tag history for a specific bill
router.get('/bill/:billNumber', async (req, res) => {
  try {
    const tags = await TagHistory.find({ billNumber: req.params.billNumber })
      .sort({ tagIndex: 1 });

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching bill tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill tags',
      error: error.message
    });
  }
});

// Get tag history for a customer
router.get('/customer/:phone', async (req, res) => {
  try {
    const tags = await TagHistory.find({ customerPhone: req.params.phone })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching customer tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer tags',
      error: error.message
    });
  }
});

// Create tag history entries (called when tags are generated)
router.post('/', async (req, res) => {
  try {
    const tags = req.body.tags;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tags array is required'
      });
    }

    // Prevent duplicates: delete existing tags for this bill before inserting
    const billNumber = tags[0]?.billNumber;
    if (billNumber) {
      const existing = await TagHistory.countDocuments({ billNumber });
      if (existing > 0) {
        console.log(`🔄 Replacing ${existing} existing tags for bill ${billNumber}`);
        await TagHistory.deleteMany({ billNumber });
      }
    }

    const tagHistories = tags.map(tag => ({
      ...tag,
      status: 'printed',
      events: [{
        status: 'printed',
        timestamp: new Date(),
        note: 'Tag printed'
      }]
    }));

    const createdTags = await TagHistory.insertMany(tagHistories);

    res.json({
      success: true,
      data: createdTags,
      message: `${createdTags.length} tags created successfully`
    });
  } catch (error) {
    console.error('Error creating tag history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tag history',
      error: error.message
    });
  }
});

// Update tag status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const tag = await TagHistory.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    tag.status = status;
    tag.events.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });

    await tag.save();

    res.json({
      success: true,
      data: tag,
      message: 'Tag status updated successfully'
    });
  } catch (error) {
    console.error('Error updating tag status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag status',
      error: error.message
    });
  }
});

// Bulk update tag status by bill number
router.patch('/bill/:billNumber/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const tags = await TagHistory.find({ billNumber: req.params.billNumber });
    
    if (tags.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tags found for this bill'
      });
    }

    const updatePromises = tags.map(tag => {
      tag.status = status;
      tag.events.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`
      });
      return tag.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `${tags.length} tags updated successfully`
    });
  } catch (error) {
    console.error('Error bulk updating tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update tags',
      error: error.message
    });
  }
});

// Get tag statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [statusStats, washTypeStats, totalTags] = await Promise.all([
      TagHistory.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      TagHistory.aggregate([
        { $match: query },
        { $group: { _id: '$washType', count: { $sum: 1 } } }
      ]),
      TagHistory.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        totalTags,
        byStatus: statusStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byWashType: washTypeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tag statistics',
      error: error.message
    });
  }
});

// Delete a single tag
router.delete('/:id', async (req, res) => {
  try {
    const tag = await TagHistory.findByIdAndDelete(req.params.id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: error.message
    });
  }
});

// Delete all tags for a bill
router.delete('/bill/:billNumber', async (req, res) => {
  try {
    const result = await TagHistory.deleteMany({ billNumber: req.params.billNumber });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tags found for this bill'
      });
    }

    res.json({
      success: true,
      message: `${result.deletedCount} tags deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting bill tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill tags',
      error: error.message
    });
  }
});

// Update a single tag
router.patch('/:id', async (req, res) => {
  try {
    const { itemName, washType, status, note } = req.body;
    
    const tag = await TagHistory.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Update fields if provided
    if (itemName) tag.itemName = itemName;
    if (washType) tag.washType = washType;
    if (status) {
      tag.status = status;
      tag.events.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`
      });
    }

    await tag.save();

    res.json({
      success: true,
      data: tag,
      message: 'Tag updated successfully'
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: error.message
    });
  }
});

// Cleanup duplicate tags in the database
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    console.log('🧹 Starting tag deduplication...');
    
    // Find all unique bill numbers
    const billNumbers = await TagHistory.distinct('billNumber');
    let totalDeleted = 0;
    let billsCleaned = 0;

    for (const billNumber of billNumbers) {
      const tags = await TagHistory.find({ billNumber }).sort({ createdAt: 1 });
      
      // Group by tagIndex - keep only the first occurrence of each tagIndex
      const seen = new Map();
      const toDelete = [];

      for (const tag of tags) {
        const key = `${tag.tagIndex}`;
        if (seen.has(key)) {
          toDelete.push(tag._id);
        } else {
          seen.set(key, tag._id);
        }
      }

      if (toDelete.length > 0) {
        await TagHistory.deleteMany({ _id: { $in: toDelete } });
        totalDeleted += toDelete.length;
        billsCleaned++;
        console.log(`  ✅ Bill ${billNumber}: removed ${toDelete.length} duplicates (kept ${seen.size} unique tags)`);
      }
    }

    console.log(`🧹 Deduplication complete: ${totalDeleted} duplicates removed from ${billsCleaned} bills`);

    res.json({
      success: true,
      message: `Cleaned ${totalDeleted} duplicate tags from ${billsCleaned} bills`,
      data: { totalDeleted, billsCleaned, totalBills: billNumbers.length }
    });
  } catch (error) {
    console.error('Error during deduplication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup duplicates',
      error: error.message
    });
  }
});

module.exports = router;
