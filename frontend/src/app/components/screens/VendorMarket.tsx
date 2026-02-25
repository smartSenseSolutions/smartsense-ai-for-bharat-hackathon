import { useState } from 'react';
import { Search, Shield, MapPin, Award, Star, X, ExternalLink, TrendingUp, Tag, Clock } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import type { Screen } from '@/app/App';

interface VendorMarketProps {
  onNavigate: (screen: Screen) => void;
  onVendorSelect: (vendor: any) => void;
  onCreateRFP: (vendor: any) => void;
}

const vendors = [
  {
    id: 1,
    name: 'MedTech Surgical Supplies',
    country: 'United States',
    region: 'North America',
    products: 'Surgical Gloves, Medical PPE, Sterile Equipment',
    trustScore: 98,
    verified: true,
    connected: true,
    connectionStatus: 'Ordered',
    certifications: ['ISO 13485', 'FDA Approved', 'CE Mark'],
    recentProjects: ['Supplied 50,000 surgical gloves to major hospitals', 'PPE distribution during pandemic'],
    capabilities: 'Sterile medical supplies, FDA-compliant manufacturing, Global distribution',
    website: 'www.medtechsurgical.com',
    yearsInBusiness: 18,
    rating: 4.9,
  },
  {
    id: 2,
    name: 'Pacific Medical Supplies',
    country: 'Singapore',
    region: 'Asia',
    products: 'Medical Equipment, Diagnostic Tools, Lab Supplies',
    trustScore: 97,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 13485', 'FDA Approved'],
    recentProjects: ['Hospital equipment supply', 'Emergency medical kits distribution'],
    capabilities: 'Medical device sourcing, Regulatory compliance, Cold chain logistics',
    website: 'www.pacificmedical.sg',
    yearsInBusiness: 12,
    rating: 4.9,
  },
  {
    id: 3,
    name: 'BioLab Solutions Inc',
    country: 'Germany',
    region: 'Europe',
    products: 'Laboratory Equipment, Reagents, Research Supplies',
    trustScore: 96,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 9001', 'ISO 13485', 'GMP'],
    recentProjects: ['Lab automation systems for research institutes', 'Reagent supply for biotech companies'],
    capabilities: 'Laboratory automation, High-purity reagents, Technical support',
    website: 'www.biolabsolutions.de',
    yearsInBusiness: 15,
    rating: 4.8,
  },
  {
    id: 4,
    name: 'HealthCare Logistics UK',
    country: 'United Kingdom',
    region: 'Europe',
    products: 'Pharmaceutical Storage, Medical Supplies, Healthcare PPE',
    trustScore: 98,
    verified: true,
    connected: true,
    connectionStatus: 'Ordered',
    certifications: ['GDP', 'ISO 9001', 'ISO 13485'],
    recentProjects: ['Vaccine distribution nationwide', 'Temperature-controlled pharmaceutical logistics'],
    capabilities: 'Cold chain management, Regulatory compliance, Global distribution',
    website: 'www.healthcarelogistics.co.uk',
    yearsInBusiness: 16,
    rating: 4.9,
  },
  {
    id: 5,
    name: 'SterileGuard Manufacturing',
    country: 'Malaysia',
    region: 'Asia',
    products: 'Sterile Gloves, Surgical Masks, Cleanroom Supplies',
    trustScore: 95,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 13485', 'FDA 510k', 'CE Mark'],
    recentProjects: ['Nitrile glove production scale-up', 'Cleanroom garment supply'],
    capabilities: 'High-volume sterile production, Quality testing, Fast turnaround',
    website: 'www.sterileguard.my',
    yearsInBusiness: 11,
    rating: 4.7,
  },
  {
    id: 6,
    name: 'Clinical Diagnostics Corp',
    country: 'United States',
    region: 'North America',
    products: 'Diagnostic Kits, Lab Reagents, Testing Equipment',
    trustScore: 97,
    verified: true,
    connected: true,
    connectionStatus: 'Ordered',
    certifications: ['CLIA', 'FDA Approved', 'ISO 13485'],
    recentProjects: ['COVID-19 test kit manufacturing', 'Rapid diagnostic development'],
    capabilities: 'Point-of-care diagnostics, FDA compliance, R&D support',
    website: 'www.clinicaldiagnostics.com',
    yearsInBusiness: 14,
    rating: 4.8,
  },
  {
    id: 7,
    name: 'Nordic Pharma Equipment',
    country: 'Sweden',
    region: 'Europe',
    products: 'Pharmaceutical Machinery, Processing Equipment, Clean Room Systems',
    trustScore: 96,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 9001', 'ISO 14001', 'GMP'],
    recentProjects: ['Pharmaceutical plant automation', 'Cleanroom installation for biotech'],
    capabilities: 'Process automation, Validation services, Equipment qualification',
    website: 'www.nordicpharma.se',
    yearsInBusiness: 20,
    rating: 4.9,
  },
  {
    id: 8,
    name: 'AsiaHealth Medical Devices',
    country: 'India',
    region: 'Asia',
    products: 'Medical Devices, Surgical Instruments, Patient Monitors',
    trustScore: 93,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 13485', 'CE Mark', 'USFDA'],
    recentProjects: ['Hospital equipment installation', 'Surgical instrument sets for clinics'],
    capabilities: 'Medical device manufacturing, Custom instruments, After-sales service',
    website: 'www.asiahealthdevices.in',
    yearsInBusiness: 13,
    rating: 4.6,
  },
  {
    id: 9,
    name: 'Swiss MedTech Solutions',
    country: 'Switzerland',
    region: 'Europe',
    products: 'Precision Instruments, Surgical Tools, Implants',
    trustScore: 99,
    verified: true,
    connected: true,
    connectionStatus: 'Ordered',
    certifications: ['ISO 13485', 'MDR', 'FDA Approved'],
    recentProjects: ['Orthopedic implant supply', 'Microsurgical instrument development'],
    capabilities: 'Precision manufacturing, Implant design, Regulatory expertise',
    website: 'www.swissmedtech.ch',
    yearsInBusiness: 25,
    rating: 5.0,
  },
  {
    id: 10,
    name: 'Global BioSupply Co',
    country: 'Canada',
    region: 'North America',
    products: 'Biotechnology Reagents, Cell Culture Media, Research Tools',
    trustScore: 94,
    verified: true,
    connected: true,
    connectionStatus: 'Contacted',
    certifications: ['ISO 9001', 'GMP', 'BSE/TSE Free'],
    recentProjects: ['Cell culture media for vaccine production', 'Custom reagent development'],
    capabilities: 'Custom formulations, Quality assurance, Technical consultation',
    website: 'www.globalbiosupply.ca',
    yearsInBusiness: 10,
    rating: 4.7,
  },
  {
    id: 11,
    name: 'European Surgical Systems',
    country: 'France',
    region: 'Europe',
    products: 'Surgical Equipment, Operating Room Supplies, Sterilization Equipment',
    trustScore: 95,
    verified: true,
    connected: false,
    certifications: ['ISO 13485', 'CE Mark', 'MDR'],
    recentProjects: ['OR equipment modernization', 'Sterilization system installation'],
    capabilities: 'Surgical solutions, Installation services, Training programs',
    website: 'www.eurosurgical.fr',
    yearsInBusiness: 17,
    rating: 4.8,
  },
  {
    id: 12,
    name: 'Japan Medical Innovation',
    country: 'Japan',
    region: 'Asia',
    products: 'Imaging Equipment, Diagnostic Systems, AI Medical Software',
    trustScore: 98,
    verified: true,
    connected: false,
    certifications: ['ISO 13485', 'PMDA', 'FDA 510k'],
    recentProjects: ['MRI systems for hospitals', 'AI-powered diagnostic software'],
    capabilities: 'Advanced imaging, AI integration, Service network',
    website: 'www.japanmedical.jp',
    yearsInBusiness: 22,
    rating: 4.9,
  },
  {
    id: 13,
    name: 'Australian HealthTech',
    country: 'Australia',
    region: 'Asia',
    products: 'Telemedicine Solutions, Health Monitoring Devices, Software',
    trustScore: 92,
    verified: true,
    connected: false,
    certifications: ['ISO 27001', 'ISO 13485', 'TGA Approved'],
    recentProjects: ['Remote patient monitoring systems', 'Telehealth platform deployment'],
    capabilities: 'Digital health, Cloud infrastructure, Regulatory compliance',
    website: 'www.aushealthtech.com.au',
    yearsInBusiness: 8,
    rating: 4.6,
  },
  {
    id: 14,
    name: 'Irish Pharmaceutical Supplies',
    country: 'Ireland',
    region: 'Europe',
    products: 'Pharmaceutical Raw Materials, APIs, Excipients',
    trustScore: 96,
    verified: true,
    connected: false,
    certifications: ['GMP', 'ISO 9001', 'EMA Approved'],
    recentProjects: ['API supply for generic drugs', 'Excipient sourcing for formulations'],
    capabilities: 'Raw material sourcing, Quality control, Regulatory documentation',
    website: 'www.irishpharma.ie',
    yearsInBusiness: 19,
    rating: 4.8,
  },
  {
    id: 15,
    name: 'Korean BioTech Partners',
    country: 'South Korea',
    region: 'Asia',
    products: 'Biologics, Cell Therapy Products, Vaccine Components',
    trustScore: 97,
    verified: true,
    connected: false,
    certifications: ['KFDA', 'ISO 13485', 'GMP'],
    recentProjects: ['Biologic drug manufacturing', 'Cell therapy product development'],
    capabilities: 'Biologics production, CDMO services, Process development',
    website: 'www.koreanbiotech.kr',
    yearsInBusiness: 12,
    rating: 4.9,
  },
];

export function VendorMarket({ onNavigate, onVendorSelect, onCreateRFP }: VendorMarketProps) {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [showAllResults, setShowAllResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; date: string }>>([
    { query: 'ISO 13485 MRI machine vendors South India with onsite installation and training', date: '23 Jan 2026' },
    { query: 'GMP certified Ibuprofen API suppliers Hyderabad with active Drug Master File registration', date: '22 Jan 2026' },
    { query: 'CDSCO medical device registration consultants India for Class C import license applications', date: '21 Jan 2026' },
    { query: 'FDA-audited oncology CROs Mumbai specializing in Phase III clinical trial management', date: '20 Jan 2026' },
    { query: 'NABL accredited genomic sequencing labs Bangalore offering comprehensive bioinformatics analysis reports', date: '19 Jan 2026' },
    { query: 'HIPAA compliant EHR software providers India with integrated telemedicine and patient portals', date: '18 Jan 2026' },
    { query: 'GDP certified pharma cold chain Delhi for international biological sample shipments', date: '17 Jan 2026' },
    { query: 'CE marked orthopedic implant exporters Gujarat with ISO 13485 quality system certification', date: '16 Jan 2026' },
    { query: 'ISO 9001 cardiac IVD reagent suppliers Pune for high volume hospital laboratory use', date: '15 Jan 2026' },
    { query: 'Medical autoclave AMC service providers Chennai with guaranteed 24-hour emergency repair response', date: '14 Jan 2026' },
  ]);
  const [showHistory, setShowHistory] = useState(false);

  // Filter vendors that match the search query (prioritized results)
  const exactMatches = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(submittedQuery.toLowerCase()) ||
    vendor.products.toLowerCase().includes(submittedQuery.toLowerCase()) ||
    vendor.country.toLowerCase().includes(submittedQuery.toLowerCase())
  );

  // Get vendors that don't match (to fill up to show at least 10)
  const otherVendors = vendors.filter(vendor => !exactMatches.includes(vendor));

  // Combine: exact matches first, then other vendors to ensure we always have results
  const allVendorsForSearch = [...exactMatches, ...otherVendors];

  // Sort to show connected vendors first within each group, then by trust score
  const sortedVendors = allVendorsForSearch.sort((a, b) => {
    if (a.connected && !b.connected) return -1;
    if (!a.connected && b.connected) return 1;
    return b.trustScore - a.trustScore;
  });

  // Limit to 8 initially, or show all if button clicked
  const displayedVendors = showAllResults ? sortedVendors : sortedVendors.slice(0, 8);
  const hasMoreResults = !showAllResults && sortedVendors.length > 8;
  const remainingCount = sortedVendors.length - 8;

  const hasSearched = submittedQuery.length > 0;

  // Function to find matching product for a vendor based on search query
  const getMatchingProduct = (vendor: any) => {
    if (!submittedQuery) return null;
    
    const products = vendor.products.split(',').map((p: string) => p.trim());
    const searchLower = submittedQuery.toLowerCase();
    
    // Find exact or partial match
    const match = products.find((product: string) => 
      product.toLowerCase().includes(searchLower) || 
      searchLower.split(' ').some(word => product.toLowerCase().includes(word))
    );
    
    // If match found, return it. Otherwise return the first product
    return match || products[0];
  };

  // Function to get multiple matching tags showing why vendor appears in search
  const getMatchReasonTags = (vendor: any) => {
    if (!submittedQuery) return [];
    
    const tags: string[] = [];
    const searchLower = submittedQuery.toLowerCase();
    const searchTerms = searchLower.split(' ').filter(term => term.length > 1); // Keep terms with 2+ chars
    
    // Check certifications match
    vendor.certifications.forEach((cert: string) => {
      const certLower = cert.toLowerCase();
      if (searchTerms.some(term => certLower.includes(term)) || searchLower.includes(certLower)) {
        if (!tags.includes(cert) && tags.length < 3) tags.push(cert);
      }
    });
    
    // Check product match - split products and check each one
    const products = vendor.products.split(',').map((p: string) => p.trim());
    products.forEach((product: string) => {
      const productLower = product.toLowerCase();
      if (searchTerms.some(term => productLower.includes(term) || term.includes(productLower.split(' ')[0]))) {
        if (!tags.includes(product) && tags.length < 3) tags.push(product);
      }
    });
    
    // Check location match
    const countryLower = vendor.country.toLowerCase();
    if (searchTerms.some(term => countryLower.includes(term) || term.includes(countryLower)) || searchLower.includes(countryLower)) {
      if (!tags.includes(vendor.country) && tags.length < 3) tags.push(vendor.country);
    }
    
    // Check capabilities match for specific keywords
    const capabilities = vendor.capabilities.toLowerCase();
    if ((searchLower.includes('cold chain') || searchLower.includes('cold-chain')) && capabilities.includes('cold chain')) {
      if (!tags.includes('Cold Chain') && tags.length < 3) tags.push('Cold Chain');
    }
    if ((searchLower.includes('fda') || searchTerms.includes('fda')) && (capabilities.includes('fda') || vendor.certifications.some((c: string) => c.toLowerCase().includes('fda')))) {
      const fdaCert = vendor.certifications.find((c: string) => c.toLowerCase().includes('fda'));
      if (fdaCert && !tags.includes(fdaCert) && tags.length < 3) {
        tags.push(fdaCert);
      } else if (!tags.includes('FDA Compliant') && tags.length < 3) {
        tags.push('FDA Compliant');
      }
    }
    if ((searchLower.includes('gmp') || searchTerms.includes('gmp')) && vendor.certifications.some((c: string) => c.toLowerCase().includes('gmp'))) {
      const gmpCert = vendor.certifications.find((c: string) => c.toLowerCase().includes('gmp'));
      if (gmpCert && !tags.includes(gmpCert) && tags.length < 3) tags.push(gmpCert);
    }
    
    // If no matches found yet, try to find any product that relates to common search terms
    if (tags.length === 0) {
      // Add the first product as a fallback
      if (products.length > 0 && tags.length < 3) {
        tags.push(products[0]);
      }
    }
    
    // Return max 3 tags
    return tags.slice(0, 3);
  };

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      setSubmittedQuery(searchQuery);
      setShowAllResults(false); // Reset to show only 8 when new search
      if (!searchHistory.some(item => item.query === searchQuery)) {
        setSearchHistory([...searchHistory, { query: searchQuery, date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) }]);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleShowMoreVendors = () => {
    setIsSearchingGlobally(true);
    // Simulate global search with a delay
    setTimeout(() => {
      setIsSearchingGlobally(false);
      setShowAllResults(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Centered Search Field */}
      {!hasSearched && (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="w-full max-w-6xl px-8">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4 text-center">Global Vendor Marketplace</h1>
            <p className="text-base text-gray-600 mb-10 text-center">Discover and connect with verified healthcare vendors worldwide</p>
            <div className="relative mb-6">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vendor name, product category, or certification..."
                className="w-full pl-14 pr-6 h-20 text-base bg-white rounded-2xl border-2 border-[#eeeff1] transition-all outline-none placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            
            {/* Popular Categories */}
            <div className="mt-6">
              <div className="flex flex-wrap justify-center gap-2.5">
                <button
                  onClick={() => {
                    setSearchQuery('Surgical Equipment');
                    setSubmittedQuery('Surgical Equipment');
                  }}
                  className="px-5 py-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                >
                  Surgical Equipment
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('Laboratory Supplies');
                    setSubmittedQuery('Laboratory Supplies');
                  }}
                  className="px-5 py-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                >
                  Laboratory Supplies
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('Medical Devices');
                    setSubmittedQuery('Medical Devices');
                  }}
                  className="px-5 py-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                >
                  Medical Devices
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('Pharmaceutical Equipment');
                    setSubmittedQuery('Pharmaceutical Equipment');
                  }}
                  className="px-5 py-2-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                >
                  Pharmaceutical Equipment
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('Diagnostic Tools');
                    setSubmittedQuery('Diagnostic Tools');
                  }}
                  className="px-5 py-2.5 text-sm font-medium bg-white border border-[#eeeff1] rounded-full hover:border-[#3B82F6] hover:bg-blue-50 hover:text-[#3B82F6] transition-all"
                >
                  Diagnostic Tools
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8">
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">15K+</p>
                <p className="text-sm text-gray-600 font-medium">Verified Vendors</p>
              </div>
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">50L+</p>
                <p className="text-sm text-gray-600 font-medium">Product Categories</p>
              </div>
              <div className="text-center py-6 px-4 rounded-xl border border-[#eeeff1] bg-white">
                <p className="text-3xl font-bold text-gray-900 mb-2">98%</p>
                <p className="text-sm text-gray-600 font-medium">Avg Trust Score</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {hasSearched && (
        <div className="px-8 py-6 relative">
          {/* History Button - Top Right Corner */}
          <div className="absolute top-6 right-8 z-40">
            <Button
              variant="outline"
              className="h-11 px-4 rounded-full hover:bg-gray-100 flex items-center gap-2 border-[#eeeff1]"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">History</span>
            </Button>
          </div>

          {/* Search Bar - Left Side */}
          <div className={`transition-all duration-300 ${
            isSearchFocused ? 'flex-1 max-w-3xl' : 'max-w-xl'
          }`}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all ${
                isSearchFocused ? 'w-5 h-5' : 'w-4 h-4 left-3'
              }`} />
              <input
                type="text"
                placeholder="Search for vendors or products"
                className={`w-full pr-4 bg-white rounded-3xl border border-[#eeeff1] transition-all outline-none ${
                  isSearchFocused 
                    ? 'pl-12 h-14 text-base' 
                    : 'pl-10 h-11 text-sm'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* Search Title */}
          <div className="max-w-[1400px] mx-auto mt-8 mb-1">
            <h2 className="text-xl font-semibold text-gray-900">{searchQuery}</h2>
          </div>

          {/* Results Count */}
          <div className="max-w-[1400px] mx-auto mb-6">
            <p className="text-sm text-gray-600">
              {displayedVendors.length} vendor{displayedVendors.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Vendors Grid */}
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {displayedVendors.map((vendor) => (
                <Card 
                  key={vendor.id}
                  className="bg-white hover:bg-gray-50 transition-all cursor-pointer group border border-[#eeeff1]"
                  onClick={() => {
                    setSelectedVendor(vendor);
                    onVendorSelect(vendor);
                  }}
                >
                  <CardContent className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{vendor.name}</h3>
                          {vendor.verified && (
                            <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        {getMatchReasonTags(vendor).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {getMatchReasonTags(vendor).map((tag, index) => (
                              <Badge key={index} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-0 leading-none">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mb-2">{vendor.products}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{vendor.country}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{vendor.certifications.length} certs</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-600">{vendor.yearsInBusiness}y</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-sm font-bold text-green-600">{vendor.trustScore}%</span>
                        </div>
                        {vendor.connected && vendor.connectionStatus && (
                          <Badge className={`text-[10px] px-1.5 py-0.5 border-0 leading-none ${
                            vendor.connectionStatus === 'Ordered' 
                              ? 'bg-blue-50 text-[#3B82F6]' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {vendor.connectionStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Show More Results Button */}
            {hasMoreResults && (
              <div className="mt-8 flex justify-center">
                {isSearchingGlobally ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-gray-200 border-t-[#3B82F6] rounded-full animate-spin"></div>
                      <Search className="w-6 h-6 text-[#3B82F6] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium text-gray-900">Searching globally...</p>
                      <p className="text-sm text-gray-500 mt-1">Finding more vendors worldwide</p>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="h-12 px-8 border border-[#3B82F6] bg-white hover:bg-blue-50 text-[#3B82F6] font-medium transition-colors"
                    onClick={handleShowMoreVendors}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Show more vendors
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vendor Detail Panel */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-end">
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Vendor Details</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedVendor(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Vendor Header */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h3>
                  <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-0">
                    <Shield className="w-3 h-3 mr-1 inline" />
                    Verified
                  </Badge>
                  {selectedVendor.connected && selectedVendor.connectionStatus && (
                    <Badge className={`text-xs px-2 py-0.5 border-0 ${
                      selectedVendor.connectionStatus === 'Ordered' 
                        ? 'bg-blue-50 text-[#3B82F6]' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      <Tag className="w-3 h-3 mr-1 inline" />
                      {selectedVendor.connectionStatus}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.country}, {selectedVendor.region}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Years in Business</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.yearsInBusiness} years</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trust Score (AI Generated)</p>
                    <p className="text-sm font-medium text-green-600">{selectedVendor.trustScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.rating} / 5.0</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Portfolio Section */}
              <Card className="bg-blue-50 border-0">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">AI-Fetched Portfolio Data</h4>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-900 mb-2">Recent Projects</p>
                    <ul className="space-y-1.5">
                      {selectedVendor.recentProjects.map((project: string, index: number) => (
                        <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{project}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-900 mb-1">Official Capabilities</p>
                    <p className="text-xs text-gray-700">{selectedVendor.capabilities}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-900 mb-1">Website</p>
                    <a 
                      href={`https://${selectedVendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {selectedVendor.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVendor.certifications.map((cert: string, index: number) => (
                    <Badge key={index} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-0">
                      <Award className="w-3 h-3 mr-1 inline" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] h-10"
                  onClick={() => onCreateRFP(selectedVendor)}
                >
                  Create RFP for this Vendor
                </Button>
                <Button variant="outline" className="flex-1 h-10 border-[#eeeff1]">
                  Add to Watchlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search History Side Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#eeeff1] p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Search History</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowHistory(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              {searchHistory.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">{searchHistory.length} search{searchHistory.length !== 1 ? 'es' : ''}</p>
                  </div>
                  
                  {searchHistory.slice().reverse().map((historyItem, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
                      onClick={() => {
                        setSearchQuery(historyItem.query);
                        setSubmittedQuery(historyItem.query);
                        setShowHistory(false);
                        setShowAllResults(false);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Search className="w-4 h-4 text-gray-400 group-hover:text-[#3B82F6]" />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-[#3B82F6]">{historyItem.query}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{historyItem.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No search history yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your searches will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}