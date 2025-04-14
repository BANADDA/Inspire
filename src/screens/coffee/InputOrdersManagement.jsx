import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase/firebase';

// Placeholder for input items - fetch from Firestore in a real app
const availableInputItems = [
  { id: 'seed001', name: 'Arabica Seedlings (Type A)', category: 'seeds', unitPrice: 500, supplier: 'Nursery Inc.' },
  { id: 'seed002', name: 'Robusta Seedlings (Type B)', category: 'seeds', unitPrice: 450, supplier: 'Nursery Inc.' },
  { id: 'fert001', name: 'Organic Fertilizer (NPK 10-10-10)', category: 'fertilizer', unitPrice: 50000, unit: '50kg bag', supplier: 'Agro Supplies Ltd.' },
  { id: 'fert002', name: 'Calcium Nitrate', category: 'fertilizer', unitPrice: 65000, unit: '25kg bag', supplier: 'Agro Supplies Ltd.' },
  { id: 'tool001', name: 'Pruning Shears', category: 'tools', unitPrice: 15000, supplier: 'Farm Tools Co.' },
  { id: 'pest001', name: 'Copper Fungicide', category: 'pesticides', unitPrice: 25000, unit: '1L bottle', supplier: 'Crop Protection Ltd.' },
];

const InputOrdersManagement = ({ darkMode, userRole }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('orderDate');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Modal states
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form states
  const [farmers, setFarmers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [organizationInfo, setOrganizationInfo] = useState({
    name: "Coffee Cooperative",
    address: "123 Coffee Road, Kampala, Uganda",
    phone: "+256 700 123456",
    email: "info@coffeecoop.org"
  });
  const [newOrderData, setNewOrderData] = useState({
    farmerId: '',
    farmerName: '',
    items: [],
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    totalAmount: 0,
    status: 'pending',
    notes: '',
    supplierId: '',
    supplierName: '',
    invoiceNumber: '',
    approved: false,
    orderType: 'seeds'
  });
  const [editingOrderData, setEditingOrderData] = useState(null);
  const [currentOrderType, setCurrentOrderType] = useState('seeds');

  // Fetch orders
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let q = query(collection(db, "inputOrders"), orderBy(sortField, sortDirection));
      
      if (statusFilter !== 'all') {
        q = query(collection(db, "inputOrders"), where("status", "==", statusFilter), orderBy(sortField, sortDirection));
      }
      
      const querySnapshot = await getDocs(q);
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error("Error fetching input orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch farmers for dropdown
  const fetchFarmers = async () => {
    setLoadingFarmers(true);
    try {
      const farmersRef = collection(db, 'farmers');
      const farmersQuery = query(farmersRef, orderBy('fullName', 'asc'));
      const querySnapshot = await getDocs(farmersQuery);
      
      const farmersData = [];
      querySnapshot.forEach((doc) => {
        farmersData.push({ id: doc.id, ...doc.data() });
      });
      
      setFarmers(farmersData);
    } catch (error) {
      console.error("Error fetching farmers:", error);
      toast.error("Failed to load farmers list");
    } finally {
      setLoadingFarmers(false);
    }
  };
  
  // Fetch suppliers for dropdown
  const fetchSuppliers = async (category = null) => {
    setLoadingSuppliers(true);
    try {
      console.log("Fetching suppliers for category:", category);
      
      let suppliersRef;
      // First, let's get all active suppliers
      suppliersRef = query(
        collection(db, 'suppliers'),
        where("active", "==", true),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(suppliersRef);
      
      const suppliersData = [];
      querySnapshot.forEach((doc) => {
        const supplierData = { id: doc.id, ...doc.data() };
        
        // If category filter is active, check if supplier has matching products
        if (category && category !== 'all') {
          // Check for exact match or similar words (singular/plural forms)
          const categoryLower = category.toLowerCase();
          const supplierCategoryLower = supplierData.category?.toLowerCase() || '';
          
          // Check if supplier category contains our filter or vice versa
          const categoryMatch = 
            supplierCategoryLower.includes(categoryLower) || 
            categoryLower.includes(supplierCategoryLower);
          
          // Check if any products match our category
          const hasMatchingProducts = supplierData.products?.some(product => 
            product.toLowerCase().includes(categoryLower));
            
          if (categoryMatch || hasMatchingProducts) {
            console.log("Supplier matched category:", supplierData.name, "for", category);
            suppliersData.push(supplierData);
          }
        } else {
          suppliersData.push(supplierData);
        }
      });
      
      console.log("Suppliers found:", suppliersData.length, suppliersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers list");
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortDirection, statusFilter]); // Add dependency array comment to satisfy linter if needed

  // Fetch farmers when opening the new order modal
  useEffect(() => {
    if (showNewOrderModal || showEditModal) {
      fetchFarmers();
      fetchSuppliers(currentOrderType);
    }
  }, [showNewOrderModal, showEditModal, currentOrderType]);

  // Filter orders based on search query and category
  useEffect(() => {
    if (orders.length === 0) return;

    let filtered = [...orders];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(order => 
        order.farmerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items?.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.items?.some(item => item.category.toLowerCase() === categoryFilter.toLowerCase())
      );
    }
    
    setFilteredOrders(filtered);
  }, [searchQuery, categoryFilter, orders]);

  // Handle sort change
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="h-4 w-4 mr-1" />, class: 'bg-yellow-100 text-yellow-800' };
      case 'approved':
        return { icon: <CheckCircle className="h-4 w-4 mr-1" />, class: 'bg-blue-100 text-blue-800' };
      case 'shipped':
        return { icon: <Truck className="h-4 w-4 mr-1" />, class: 'bg-purple-100 text-purple-800' };
      case 'delivered':
        return { icon: <CheckCircle className="h-4 w-4 mr-1" />, class: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { icon: <AlertCircle className="h-4 w-4 mr-1" />, class: 'bg-red-100 text-red-800' };
      default:
        return { icon: <Clock className="h-4 w-4 mr-1" />, class: 'bg-gray-100 text-gray-800' };
    }
  };
  
  // Get approval badge
  const getApprovalBadge = (approved) => {
    return approved 
      ? { icon: <CheckCircle className="h-4 w-4 mr-1" />, class: 'bg-green-100 text-green-800', text: 'Approved' }
      : { icon: <Clock className="h-4 w-4 mr-1" />, class: 'bg-yellow-100 text-yellow-800', text: 'Awaiting Approval' };
  };
  
  // Get summary stats
  const getOrderStats = () => {
    let totalOrders = orders.length;
    let pendingOrders = orders.filter(order => order.status === 'pending').length;
    let deliveredOrders = orders.filter(order => order.status === 'delivered').length;
    let approvedOrders = orders.filter(order => order.approved === true).length;
    let totalValue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    
    return { totalOrders, pendingOrders, deliveredOrders, approvedOrders, totalValue };
  };

  const stats = getOrderStats();
  
  // Reset new order form
  const resetNewOrderForm = () => {
    setNewOrderData({
      farmerId: '',
      farmerName: '',
      items: [],
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      totalAmount: 0,
      status: 'pending',
      notes: '',
      supplierId: '',
      supplierName: '',
      invoiceNumber: '',
      approved: false,
      orderType: 'seeds'
    });
    setSelectedSupplier(null);
    setAvailableItems([]);
  };

  // Handle farmer selection for new order
  const handleFarmerSelect = (farmerId, formType = 'new') => {
    const selectedFarmer = farmers.find(farmer => farmer.id === farmerId);
    if (selectedFarmer) {
      const farmerName = selectedFarmer.fullName || `${selectedFarmer.firstName || ''} ${selectedFarmer.lastName || ''}`.trim();
      if (formType === 'new') {
        setNewOrderData(prev => ({ ...prev, farmerId, farmerName }));
      } else if (formType === 'edit' && editingOrderData) {
        setEditingOrderData(prev => ({ ...prev, farmerId, farmerName }));
      }
    }
  };
  
  // Handle order type change
  const handleOrderTypeChange = (orderType, formType = 'new') => {
    fetchSuppliers(orderType);
    setCurrentOrderType(orderType);
    
    if (formType === 'new') {
      setNewOrderData(prev => ({ 
        ...prev, 
        orderType,
        supplierId: '',
        supplierName: '',
        items: []
      }));
    } else if (formType === 'edit' && editingOrderData) {
      setEditingOrderData(prev => ({ 
        ...prev, 
        orderType,
        supplierId: '',
        supplierName: '',
        items: []
      }));
    }
    
    setSelectedSupplier(null);
    setAvailableItems([]);
  };
  
  // Handle supplier selection
  const handleSupplierSelect = (supplierId, formType = 'new') => {
    const selected = suppliers.find(supplier => supplier.id === supplierId);
    if (!selected) return;
    
    setSelectedSupplier(selected);
    console.log("Selected supplier:", selected);
    
    // Generate items from supplier's products
    let items = [];
    if (selected.products && selected.products.length > 0) {
      items = selected.products.map((product, index) => {
        // Extract category from the product tags if available
        let category = '';
        if (selected.category) {
          category = selected.category;
        } else if (product.toLowerCase().includes('seed')) {
          category = 'seeds';
        } else if (product.toLowerCase().includes('fertilizer')) {
          category = 'fertilizers';
        } else if (product.toLowerCase().includes('tool') || product.toLowerCase().includes('equipment')) {
          category = 'equipment';
        } else if (product.toLowerCase().includes('pesticide') || product.toLowerCase().includes('fungicide')) {
          category = 'pesticides';
        } else {
          category = 'other';
        }
        
        return {
          id: `${selected.id}_${index}`,
          name: product,
          category: category,
          unitPrice: 0, // Default price to be updated by user
          supplier: selected.name,
          quantity: 0
        };
      });
    }
    
    console.log("Generated items from supplier products:", items);
    setAvailableItems(items);
    
    if (formType === 'new') {
      setNewOrderData(prev => ({ 
        ...prev, 
        supplierId: selected.id, 
        supplierName: selected.name,
        items: [] // Reset items when changing supplier
      }));
    } else if (formType === 'edit' && editingOrderData) {
      setEditingOrderData(prev => ({ 
        ...prev, 
        supplierId: selected.id, 
        supplierName: selected.name,
        items: [] // Reset items when changing supplier
      }));
    }
  };

  // Calculate total amount for an order
  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // Add item to order (New or Edit)
  const handleAddItem = (itemId, formType = 'new') => {
    const itemToAdd = availableItems.find(item => item.id === itemId);
    if (!itemToAdd) return;

    const updateFn = formType === 'new' ? setNewOrderData : setEditingOrderData;
    
    updateFn(prev => {
      const existingItem = prev.items.find(item => item.id === itemId);
      let updatedItems;
      if (existingItem) {
        updatedItems = prev.items.map(item => 
          item.id === itemId ? { ...item, quantity: (item.quantity || 0) + 1 } : item
        );
      } else {
        updatedItems = [...prev.items, { ...itemToAdd, quantity: 1 }];
      }
      return { ...prev, items: updatedItems, totalAmount: calculateTotal(updatedItems) };
    });
  };

  // Update item quantity (New or Edit)
  const handleUpdateQuantity = (itemId, quantity, formType = 'new') => {
    const updateFn = formType === 'new' ? setNewOrderData : setEditingOrderData;
    
    updateFn(prev => {
      const updatedItems = prev.items.map(item => 
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item // Ensure quantity is not negative
      ).filter(item => item.quantity > 0); // Remove item if quantity is 0
      
      return { ...prev, items: updatedItems, totalAmount: calculateTotal(updatedItems) };
    });
  };

  // Remove item from order (New or Edit)
  const handleRemoveItem = (itemId, formType = 'new') => {
    const updateFn = formType === 'new' ? setNewOrderData : setEditingOrderData;
    
    updateFn(prev => {
      const updatedItems = prev.items.filter(item => item.id !== itemId);
      return { ...prev, items: updatedItems, totalAmount: calculateTotal(updatedItems) };
    });
  };

  // Handle form field changes (New or Edit)
  const handleFormChange = (field, value, formType = 'new') => {
    const updateFn = formType === 'new' ? setNewOrderData : setEditingOrderData;
    updateFn(prev => ({ ...prev, [field]: value }));
  };

  // Generate invoice for an order
  const generateInvoice = async (order) => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      
      // Add standard font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Set drawing parameters
      const textSize = 12;
      const margin = 50;
      let y = height - margin;
      
      // Draw organization info
      page.drawText(organizationInfo.name, {
        x: margin,
        y,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      y -= 25;
      page.drawText(organizationInfo.address, {
        x: margin,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      y -= 15;
      page.drawText(`Phone: ${organizationInfo.phone}`, {
        x: margin,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      y -= 15;
      page.drawText(`Email: ${organizationInfo.email}`, {
        x: margin,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Draw invoice title and number
      y -= 40;
      page.drawText(`INVOICE`, {
        x: width / 2 - 40,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      y -= 20;
      page.drawText(`Invoice #: ${order.invoiceNumber || order.orderId}`, {
        x: width / 2 - 60,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      y -= 15;
      page.drawText(`Date: ${formatDate(order.orderDate)}`, {
        x: width / 2 - 60,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Draw farmer information
      y -= 40;
      page.drawText('Bill To:', {
        x: margin,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      y -= 15;
      page.drawText(`Farmer: ${order.farmerName}`, {
        x: margin,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Draw supplier information
      page.drawText('Supplier:', {
        x: width - margin - 150,
        y: y + 15,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`${order.supplierName || 'Various Suppliers'}`, {
        x: width - margin - 150,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Draw order details table headers
      y -= 40;
      const tableTop = y;
      const col1 = margin;
      const col2 = margin + 220;
      const col3 = margin + 300;
      const col4 = margin + 380;
      
      page.drawText('Description', {
        x: col1,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Quantity', {
        x: col2,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Unit Price', {
        x: col3,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Amount', {
        x: col4,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      // Draw horizontal line
      y -= 5;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      // Draw items
      y -= 20;
      for (const item of order.items) {
        page.drawText(item.name, {
          x: col1,
          y,
          size: textSize,
          font,
          color: rgb(0, 0, 0),
        });
        
        page.drawText(item.quantity.toString(), {
          x: col2,
          y,
          size: textSize,
          font,
          color: rgb(0, 0, 0),
        });
        
        page.drawText(formatCurrency(item.unitPrice), {
          x: col3,
          y,
          size: textSize,
          font,
          color: rgb(0, 0, 0),
        });
        
        page.drawText(formatCurrency(item.quantity * item.unitPrice), {
          x: col4,
          y,
          size: textSize,
          font,
          color: rgb(0, 0, 0),
        });
        
        y -= 20;
        // Add a new page if we run out of space
        if (y < margin + 100) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
      }
      
      // Draw horizontal line
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      // Draw total
      y -= 30;
      page.drawText('Total:', {
        x: col3,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formatCurrency(order.totalAmount), {
        x: col4,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      // Draw approval status
      y -= 40;
      const approvalStatus = order.approved ? 'APPROVED' : 'PENDING APPROVAL';
      const approvalColor = order.approved ? rgb(0, 0.5, 0) : rgb(0.8, 0.6, 0);
      
      page.drawText('Payment Status:', {
        x: margin,
        y,
        size: textSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(approvalStatus, {
        x: margin + 120,
        y,
        size: textSize,
        font: boldFont,
        color: approvalColor,
      });
      
      // Draw footer
      y = margin + 30;
      page.drawText('Thank you for your business!', {
        x: width / 2 - 80,
        y,
        size: textSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Create a blob and download the file
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${order.invoiceNumber || order.orderId}.pdf`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
      return false;
    }
  };
  
  // Toggle order approval status
  const toggleOrderApproval = async (orderId, currentStatus) => {
    try {
      const orderRef = doc(db, 'inputOrders', orderId);
      await updateDoc(orderRef, {
        approved: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(currentStatus ? "Order unapproved" : "Order approved!");
      fetchOrders(); // Refresh list
      return true;
    } catch (error) {
      console.error("Error toggling order approval:", error);
      toast.error("Failed to update order approval status");
      return false;
    }
  };

  // Save New Order
  const handleSaveNewOrder = async () => {
    if (!newOrderData.farmerId || newOrderData.items.length === 0 || !newOrderData.supplierId) {
      toast.error("Please select a farmer, a supplier, and add at least one item.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Generate a simple order ID and invoice number
      const orderIdSuffix = Date.now().toString().slice(-6);
      const orderId = `ORD-${orderIdSuffix}`;
      const invoiceNumber = `INV-${orderIdSuffix}`;
      
      const orderPayload = {
        ...newOrderData,
        orderId,
        invoiceNumber,
        orderDate: new Date(newOrderData.orderDate),
        expectedDeliveryDate: newOrderData.expectedDeliveryDate ? new Date(newOrderData.expectedDeliveryDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'inputOrders'), orderPayload);
      
      toast.success("Input order created successfully!");
      setShowNewOrderModal(false);
      resetNewOrderForm();
      
      // Fetch the newly created order for invoice generation if needed
      if (userRole === 'admin') {
        const orderWithId = { 
          id: docRef.id, 
          ...orderPayload, 
        };
        setSelectedOrder(orderWithId);
        setShowInvoiceModal(true);
      }
      
      fetchOrders(); // Refresh list
    } catch (error) {
      console.error("Error saving new order:", error);
      toast.error("Failed to create order.");
    } finally {
      setIsLoading(false);
    }
  };

  // Open View Modal
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  // Open Edit Modal
  const handleEditOrder = async (order) => {
    try {
      // Fetch the latest order data in case it changed
      const orderRef = doc(db, 'inputOrders', order.id);
      const docSnap = await getDoc(orderRef);
      if (docSnap.exists()) {
        const currentOrderData = { id: docSnap.id, ...docSnap.data() };
        // Ensure dates are formatted correctly for input fields
        currentOrderData.orderDate = currentOrderData.orderDate?.toDate ? currentOrderData.orderDate.toDate().toISOString().split('T')[0] : '';
        currentOrderData.expectedDeliveryDate = currentOrderData.expectedDeliveryDate?.toDate ? currentOrderData.expectedDeliveryDate.toDate().toISOString().split('T')[0] : '';
        
        setEditingOrderData(currentOrderData);
        setSelectedOrder(currentOrderData); // Keep track of original for comparison or reference
        setShowEditModal(true);
      } else {
        toast.error("Order not found.");
      }
    } catch (error) {
      console.error("Error fetching order for edit:", error);
      toast.error("Could not load order data for editing.");
    }
  };
  
  // Save Updated Order
  const handleUpdateOrder = async () => {
    if (!editingOrderData || !editingOrderData.id) {
      toast.error("Invalid order data.");
      return;
    }
    
    if (editingOrderData.items.length === 0) {
      toast.error("Order must contain at least one item.");
      return;
    }

    setIsLoading(true);
    try {
      const orderRef = doc(db, 'inputOrders', editingOrderData.id);
      
      const updatePayload = {
        ...editingOrderData,
        orderDate: new Date(editingOrderData.orderDate),
        expectedDeliveryDate: editingOrderData.expectedDeliveryDate ? new Date(editingOrderData.expectedDeliveryDate) : null,
        updatedAt: serverTimestamp()
      };
      // Remove id from payload as it's the document key
      delete updatePayload.id; 
      
      await updateDoc(orderRef, updatePayload);
      
      toast.success("Order updated successfully!");
      setShowEditModal(false);
      setEditingOrderData(null);
      fetchOrders(); // Refresh list
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order.");
    } finally {
      setIsLoading(false);
    }
  };

  // Export orders to CSV
  const exportOrdersToCSV = () => {
    try {
      if (filteredOrders.length === 0) {
        toast.error("No orders to export");
        return;
      }
      
      // Define CSV headers
      const headers = [
        'Order ID', 
        'Farmer', 
        'Supplier', 
        'Items', 
        'Order Date', 
        'Expected Delivery', 
        'Amount', 
        'Status', 
        'Approved'
      ];
      
      // Format order data for CSV
      const csvData = filteredOrders.map(order => [
        order.orderId || order.id,
        order.farmerName,
        order.supplierName || 'Not specified',
        order.items?.map(item => item.name).join(', '),
        formatDate(order.orderDate),
        formatDate(order.expectedDeliveryDate),
        order.totalAmount,
        order.status,
        order.approved ? 'Yes' : 'No'
      ]);
      
      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      csvData.forEach(row => {
        // Ensure values with commas are wrapped in quotes
        const formattedRow = row.map(value => {
          const strValue = String(value || '');
          return strValue.includes(',') ? `"${strValue}"` : strValue;
        });
        csvContent += formattedRow.join(',') + '\n';
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `input_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Orders exported successfully!");
    } catch (error) {
      console.error("Error exporting orders:", error);
      toast.error("Failed to export orders");
    }
  };

  return (
    <div className={`w-full h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Package className="mr-2 h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold">Input Orders Management</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className={`relative flex-grow md:w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md`}>
              <input
                type="text"
                placeholder="Search orders..."
                className={`w-full pl-10 pr-4 py-2 rounded-md border ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={fetchOrders}
                className={`flex items-center px-3 py-2 rounded-md ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Refresh</span>
              </button>
              
              <button 
                onClick={exportOrdersToCSV}
                className={`flex items-center px-3 py-2 rounded-md ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <Download className="h-4 w-4 mr-2" />
                <span>Export</span>
              </button>
              
              {userRole === 'admin' && (
                <button 
                  onClick={() => {
                    resetNewOrderForm(); // Ensure form is reset before opening
                    setShowNewOrderModal(true);
                  }}
                  className={`flex items-center px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>New Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Order Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <Package className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="font-medium">Total Orders</h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="font-medium">Pending Orders</h3>
            </div>
            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Approved Orders</h3>
            </div>
            <p className="text-2xl font-bold">{stats.approvedOrders}</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Total Value</h3>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 rounded-md ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
              } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              <span>Filters</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showFilters && (
              <div className={`absolute top-12 left-0 w-64 p-4 rounded-md shadow-lg z-10 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <h3 className="font-medium mb-2">Order Status</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>All Orders</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('pending')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'pending' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Pending</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('approved')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'approved' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Approved</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('shipped')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'shipped' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Shipped</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('delivered')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'delivered' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Delivered</span>
                  </button>
                </div>
                
                <h3 className="font-medium mb-2 mt-4">Input Category</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setCategoryFilter('all')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>All Categories</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('seeds')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'seeds' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Seeds</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('fertilizer')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'fertilizer' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Fertilizer</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('equipment')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'equipment' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Equipment</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('pesticides')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'pesticides' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Pesticides</span>
                  </button>
                </div>
                
                <h3 className="font-medium mb-2 mt-4">Sort by</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSort('orderDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'orderDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Order Date</span>
                    {sortField === 'orderDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('expectedDeliveryDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'expectedDeliveryDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Delivery Date</span>
                    {sortField === 'expectedDeliveryDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('totalAmount')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'totalAmount' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Amount</span>
                    {sortField === 'totalAmount' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Status: <span className="font-medium">{statusFilter === 'all' ? 'All Orders' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}</span></p>
            {categoryFilter !== 'all' && (
              <p>Category: <span className="font-medium">{categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}</span></p>
            )}
            <p>Sort: <span className="font-medium">
              {sortField === 'orderDate' ? 'Order Date' : 
               sortField === 'expectedDeliveryDate' ? 'Delivery Date' : 
               'Amount'} ({sortDirection === 'asc' ? 'Ascending' : 'Descending'})
            </span></p>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No orders found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  Clear search
                </button>
              )}
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  View all orders
                </button>
              )}
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  Clear category filter
                </button>
              )}
            </div>
          ) : (
            <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Farmer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Supplier
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Items
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Order Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Approval
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                  {filteredOrders.map((order) => {
                    const statusBadge = getStatusBadge(order.status);
                    const approvalBadge = getApprovalBadge(order.approved || false);
                    
                    return (
                      <tr key={order.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.orderId || order.id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.farmerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.supplierName || "Not specified"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate">
                            {order.items?.map(item => item.name).join(', ') || 'No items'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${statusBadge.class}`}>
                            {statusBadge.icon}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${approvalBadge.class}`}>
                            {approvalBadge.icon}
                            {approvalBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleViewOrder(order)} 
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            View
                          </button>
                          {userRole === 'admin' && (
                            <>
                              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                <button 
                                  onClick={() => handleEditOrder(order)} 
                                  className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                  Edit
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowInvoiceModal(true);
                                }} 
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Invoice
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* All the modals go here... */}
        
        {/* New Order Modal */}
        {showNewOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-4xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-auto`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Create New Input Order</h2>
                  <button 
                    onClick={() => setShowNewOrderModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Order Type Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Order Type</label>
                    <div className="flex flex-wrap gap-2">
                      {['seeds', 'fertilizer', 'equipment', 'pesticides'].map((type) => (
                        <button
                          key={type}
                          onClick={() => handleOrderTypeChange(type)}
                          className={`px-3 py-2 rounded-md border ${
                            newOrderData.orderType === type 
                              ? 'bg-green-100 border-green-500 text-green-700' 
                              : darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Farmer Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Select Farmer</label>
                    <select
                      value={newOrderData.farmerId}
                      onChange={(e) => handleFarmerSelect(e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">-- Select Farmer --</option>
                      {farmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id}>
                          {farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Supplier Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Select Supplier</label>
                    <select
                      value={newOrderData.supplierId}
                      onChange={(e) => handleSupplierSelect(e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      disabled={!newOrderData.orderType || suppliers.length === 0}
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Order Date */}
                  <div>
                    <label className="block mb-2 font-medium">Order Date</label>
                    <input
                      type="date"
                      value={newOrderData.orderDate}
                      onChange={(e) => handleFormChange('orderDate', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Expected Delivery Date */}
                  <div>
                    <label className="block mb-2 font-medium">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={newOrderData.expectedDeliveryDate}
                      onChange={(e) => handleFormChange('expectedDeliveryDate', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                {/* Items Section */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  
                  {/* Available Items */}
                  {availableItems.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm mb-2">Available Items from {newOrderData.supplierName}:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availableItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleAddItem(item.id)}
                            className={`text-left p-2 rounded-md border ${
                              darkMode ? 'border-gray-700 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm">{item.category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Items */}
                  {newOrderData.items.length > 0 ? (
                    <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Item
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Category
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Unit Price (UGX)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Quantity
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                          {newOrderData.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.category}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const items = [...newOrderData.items];
                                    const index = items.findIndex(i => i.id === item.id);
                                    items[index] = {...items[index], unitPrice: Number(e.target.value)};
                                    setNewOrderData({...newOrderData, items, totalAmount: calculateTotal(items)});
                                  }}
                                  className={`w-20 p-1 rounded-md border ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                                  className={`w-20 p-1 rounded-md border ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatCurrency(item.quantity * item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`text-center p-4 border border-dashed rounded-lg ${
                      darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'
                    }`}>
                      {newOrderData.supplierId ? 
                        "Select items from the available list above" : 
                        "Select a supplier to see available items"}
                    </div>
                  )}
                  
                  {/* Order Total */}
                  {newOrderData.items.length > 0 && (
                    <div className="mt-4 text-right">
                      <p className="font-medium">Total: {formatCurrency(newOrderData.totalAmount)}</p>
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                <div className="mb-6">
                  <label className="block mb-2 font-medium">Notes</label>
                  <textarea
                    value={newOrderData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows="3"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Add any notes or special instructions here..."
                  ></textarea>
                </div>
              </div>
              
              <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-3`}>
                <button
                  onClick={() => setShowNewOrderModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewOrder}
                  disabled={isLoading || newOrderData.items.length === 0}
                  className={`px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center ${
                    (isLoading || newOrderData.items.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Order</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* View Order Modal */}
        {showViewModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-4xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-auto`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Order Details</h2>
                  <button 
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold mb-2">Order Information</h3>
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="mb-2"><span className="font-medium">Order ID:</span> {selectedOrder.orderId || selectedOrder.id}</p>
                      <p className="mb-2"><span className="font-medium">Date:</span> {formatDate(selectedOrder.orderDate)}</p>
                      <p className="mb-2"><span className="font-medium">Expected Delivery:</span> {formatDate(selectedOrder.expectedDeliveryDate) || 'Not specified'}</p>
                      <p className="mb-2"><span className="font-medium">Status:</span> {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}</p>
                      <p className="mb-2"><span className="font-medium">Approval:</span> {selectedOrder.approved ? 'Approved' : 'Pending Approval'}</p>
                      <p className="mb-2"><span className="font-medium">Total:</span> {formatCurrency(selectedOrder.totalAmount)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Farmer & Supplier</h3>
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="mb-2"><span className="font-medium">Farmer:</span> {selectedOrder.farmerName}</p>
                      <p className="mb-2"><span className="font-medium">Supplier:</span> {selectedOrder.supplierName || 'Not specified'}</p>
                      {selectedOrder.notes && (
                        <>
                          <p className="font-medium mt-4">Notes:</p>
                          <p className="mt-1">{selectedOrder.notes}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden mb-6`}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Item
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {userRole === 'admin' && (
                  <div className="flex justify-between items-center">
                    <div>
                      <button
                        onClick={() => toggleOrderApproval(selectedOrder.id, selectedOrder.approved)}
                        className={`px-4 py-2 rounded-md ${
                          selectedOrder.approved
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white`}
                      >
                        {selectedOrder.approved ? 'Unapprove Order' : 'Approve Order'}
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          generateInvoice(selectedOrder);
                        }}
                        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        <span>Download Invoice</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Order Modal */}
        {showEditModal && editingOrderData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-4xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-auto`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Edit Order</h2>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Order Type Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Order Type</label>
                    <div className="flex flex-wrap gap-2">
                      {['seeds', 'fertilizer', 'equipment', 'pesticides'].map((type) => (
                        <button
                          key={type}
                          onClick={() => handleOrderTypeChange(type, 'edit')}
                          className={`px-3 py-2 rounded-md border ${
                            editingOrderData.orderType === type 
                              ? 'bg-green-100 border-green-500 text-green-700' 
                              : darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Farmer Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Select Farmer</label>
                    <select
                      value={editingOrderData.farmerId}
                      onChange={(e) => handleFarmerSelect(e.target.value, 'edit')}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">-- Select Farmer --</option>
                      {farmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id}>
                          {farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Supplier Selection */}
                  <div>
                    <label className="block mb-2 font-medium">Select Supplier</label>
                    <select
                      value={editingOrderData.supplierId}
                      onChange={(e) => handleSupplierSelect(e.target.value, 'edit')}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      disabled={!editingOrderData.orderType || suppliers.length === 0}
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Order Date */}
                  <div>
                    <label className="block mb-2 font-medium">Order Date</label>
                    <input
                      type="date"
                      value={editingOrderData.orderDate}
                      onChange={(e) => handleFormChange('orderDate', e.target.value, 'edit')}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Expected Delivery Date */}
                  <div>
                    <label className="block mb-2 font-medium">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={editingOrderData.expectedDeliveryDate}
                      onChange={(e) => handleFormChange('expectedDeliveryDate', e.target.value, 'edit')}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Order Status */}
                  <div>
                    <label className="block mb-2 font-medium">Order Status</label>
                    <select
                      value={editingOrderData.status}
                      onChange={(e) => handleFormChange('status', e.target.value, 'edit')}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                {/* Items Section */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  
                  {/* Available Items */}
                  {availableItems.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm mb-2">Available Items from {editingOrderData.supplierName}:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availableItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleAddItem(item.id, 'edit')}
                            className={`text-left p-2 rounded-md border ${
                              darkMode ? 'border-gray-700 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm">{item.category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Items */}
                  {editingOrderData.items.length > 0 ? (
                    <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Item
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Category
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Unit Price (UGX)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Quantity
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                          {editingOrderData.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.category}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const items = [...editingOrderData.items];
                                    const index = items.findIndex(i => i.id === item.id);
                                    items[index] = {...items[index], unitPrice: Number(e.target.value)};
                                    setEditingOrderData({...editingOrderData, items, totalAmount: calculateTotal(items)});
                                  }}
                                  className={`w-20 p-1 rounded-md border ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value), 'edit')}
                                  className={`w-20 p-1 rounded-md border ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {formatCurrency(item.quantity * item.unitPrice)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => handleRemoveItem(item.id, 'edit')}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`text-center p-4 border border-dashed rounded-lg ${
                      darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'
                    }`}>
                      {editingOrderData.supplierId ? 
                        "Select items from the available list above" : 
                        "Select a supplier to see available items"}
                    </div>
                  )}
                  
                  {/* Order Total */}
                  {editingOrderData.items.length > 0 && (
                    <div className="mt-4 text-right">
                      <p className="font-medium">Total: {formatCurrency(editingOrderData.totalAmount)}</p>
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                <div className="mb-6">
                  <label className="block mb-2 font-medium">Notes</label>
                  <textarea
                    value={editingOrderData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value, 'edit')}
                    rows="3"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Add any notes or special instructions here..."
                  ></textarea>
                </div>
              </div>
              
              <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-3`}>
                <button
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateOrder}
                  disabled={isLoading || editingOrderData.items.length === 0}
                  className={`px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center ${
                    (isLoading || editingOrderData.items.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Update Order</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Invoice Modal - For future implementation */}
        {showInvoiceModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-4xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-auto`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Invoice Preview</h2>
                  <button 
                    onClick={() => setShowInvoiceModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <p>Invoice will be generated as a PDF with the following information:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>Order ID: {selectedOrder.orderId || selectedOrder.id}</li>
                    <li>Invoice Number: {selectedOrder.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`}</li>
                    <li>Farmer: {selectedOrder.farmerName}</li>
                    <li>Supplier: {selectedOrder.supplierName || 'Various Suppliers'}</li>
                    <li>Order Date: {formatDate(selectedOrder.orderDate)}</li>
                    <li>Items: {selectedOrder.items.length} items</li>
                    <li>Total Amount: {formatCurrency(selectedOrder.totalAmount)}</li>
                  </ul>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      generateInvoice(selectedOrder);
                      setShowInvoiceModal(false);
                    }}
                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span>Download Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

InputOrdersManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default InputOrdersManagement; 