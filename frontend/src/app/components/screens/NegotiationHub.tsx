import { Phone, Play, Download, Calendar, Clock, Users, FileText, ChevronRight, Search, X, Languages, IndianRupee, Mail } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface NegotiationHubProps {
  onNavigate: (screen: any) => void;
  selectedQuote?: any;
}

export function NegotiationHub({ onNavigate, selectedQuote }: NegotiationHubProps) {
  // Initialize state with sample data
  const negotiationCalls = [
    {
      id: 1,
      projectName: 'Medical Grade N95 Respirators',
      vendor: 'Global Electronics Supply',
      callDate: '22 Jan 2026',
      callTime: '10:00',
      duration: '35 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 7% discount for 2-year contract commitment',
        'Maintained 50-day delivery timeline',
        'Extended warranty to 3 years at no extra cost',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Sarah, thank you for joining this negotiation call.' },
        { speaker: 'Sarah Chen', time: '00:15', text: 'Good morning, happy to discuss our proposal.' },
        { speaker: 'John Doe', time: '00:25', text: 'We appreciate your quote. Can we discuss the delivery timeline?' },
        { speaker: 'Sarah Chen', time: '00:45', text: 'Yes, we quoted 50 days. We could reduce it to 42 days for an additional 3%.' },
        { speaker: 'AI Agent', time: '01:05', text: 'That would bring the total higher. Let me analyze this adjustment.' },
        { speaker: 'John Doe', time: '01:30', text: 'If we commit to a 2-year contract, can you offer a volume discount?' },
        { speaker: 'Sarah Chen', time: '01:50', text: 'For a 2-year commitment, we can offer 7% discount and maintain the 50-day delivery timeline.' },
        { speaker: 'AI Agent', time: '02:10', text: 'Excellent. This represents strong value for the procurement team.' },
        { speaker: 'John Doe', time: '02:30', text: 'Can you also extend the warranty period?' },
        { speaker: 'Sarah Chen', time: '02:50', text: 'We can extend to 3 years at no additional cost for the 2-year contract.' },
        { speaker: 'AI Agent', time: '03:15', text: 'This is an excellent deal. I recommend accepting these terms.' },
        { speaker: 'John Doe', time: '03:30', text: 'Agreed. Let\'s proceed with these terms.' },
      ],
    },
    {
      id: 2,
      projectName: 'Surgical Gloves Procurement',
      vendor: 'MedSupply International',
      callDate: '22 Jan 2026',
      callTime: '14:00',
      duration: '28 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 4.7% discount for bulk order',
        'Reduced delivery time to 30 days',
        'Added quality assurance certification',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon, thank you for joining this negotiation call.' },
        { speaker: 'Raj Kumar', time: '00:12', text: 'Good afternoon, ready to discuss our proposal.' },
        { speaker: 'Ram Krish', time: '00:25', text: 'Your delivery time is good. Can we discuss pricing for bulk orders?' },
        { speaker: 'Raj Kumar', time: '00:45', text: 'For orders above 100,000 pairs, we can offer 4.7% discount.' },
        { speaker: 'AI Agent', time: '01:05', text: 'Excellent value. Can you also reduce the delivery time?' },
        { speaker: 'Raj Kumar', time: '01:25', text: 'Yes, we can deliver in 30 days for this bulk order.' },
      ],
    },
    {
      id: 3,
      projectName: 'CT Scan Machine',
      vendor: 'MedTech Imaging Solutions',
      callDate: '21 Jan 2026',
      callTime: '15:30',
      duration: '42 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated ₹1,00,000 discount',
        '5-year comprehensive warranty included',
        'Free installation and training',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon, thank you for joining this negotiation.' },
        { speaker: 'Murugan', time: '00:15', text: 'Good afternoon. Excited to discuss how we can meet your imaging needs.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'Your quote is competitive. Can we discuss the warranty terms?' },
        { speaker: 'Murugan', time: '00:55', text: 'We offer a standard 3-year warranty. For 5-year, there would be an additional charge.' },
        { speaker: 'Ram Krish', time: '01:20', text: 'If we commit to 5-year warranty, can you reduce the base price?' },
        { speaker: 'Murugan', time: '01:45', text: 'Yes, I can offer a reduced price with 5-year comprehensive warranty included.' },
        { speaker: 'AI Agent', time: '02:10', text: 'This is an excellent offer. The 5-year warranty adds significant value.' },
      ],
    },
    {
      id: 4,
      projectName: 'Laboratory Equipment Bundle',
      vendor: 'LabTech Solutions',
      callDate: '20 Jan 2026',
      callTime: '11:00',
      duration: '31 min',
      participants: 3,
      status: 'active',
      outcome: 'In Progress',
      keyPoints: [
        'Discussed customization options',
        'Awaiting revised quote with bundle discount',
        'Follow-up call scheduled for next week',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning, thank you for joining this negotiation call.' },
        { speaker: 'Ravi Kumar', time: '00:12', text: 'Good morning. Ready to discuss the laboratory equipment bundle.' },
        { speaker: 'Ram Krish', time: '00:25', text: 'We\'re interested in customizing the package. Can we add additional microscopes?' },
        { speaker: 'Ravi Kumar', time: '00:45', text: 'Absolutely. Let me prepare a revised quote with customization and bundle discount.' },
      ],
    },
    {
      id: 5,
      projectName: 'Ultrasound Machine Procurement',
      vendor: 'Healthcare Imaging Corp',
      callDate: '20 Jan 2026',
      callTime: '09:30',
      duration: '26 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 5.5% discount on base price',
        'Added portable cart at no extra cost',
        '2-year extended warranty included',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning, thank you for joining this call.' },
        { speaker: 'Amit Banerjee', time: '00:15', text: 'Good morning. Happy to discuss our proposal.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'Can we discuss including a portable cart?' },
        { speaker: 'Amit Banerjee', time: '00:50', text: 'Yes, I can include the portable cart and offer 5.5% discount.' },
      ],
    },
    {
      id: 6,
      projectName: 'Oxygen Concentrators',
      vendor: 'MediLife Equipment',
      callDate: '19 Jan 2026',
      callTime: '14:30',
      duration: '22 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated ₹10,000 discount for 50 units',
        'Delivery in 20 days instead of 28',
        'Free maintenance for first year',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Praveen, thank you for joining.' },
        { speaker: 'Praveen Patel', time: '00:12', text: 'Good afternoon. Ready to finalize the deal.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'For 50 units, can you offer a volume discount?' },
        { speaker: 'Praveen Patel', time: '00:50', text: 'Yes, ₹1,85,000 for 50 units with free first-year maintenance.' },
      ],
    },
    {
      id: 7,
      projectName: 'ECG Machines',
      vendor: 'CardioTech Solutions',
      callDate: '19 Jan 2026',
      callTime: '10:00',
      duration: '33 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated ₹20,000 discount',
        '12-channel ECG with advanced features',
        'Training for medical staff included',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Rajesh, thank you for the ECG proposal.' },
        { speaker: 'Rajesh Kumar', time: '00:15', text: 'Good morning. Our 12-channel ECG will meet your needs.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'Can you include staff training?' },
        { speaker: 'Rajesh Kumar', time: '00:55', text: 'Yes, ₹2,95,000 with comprehensive training included.' },
      ],
    },
    {
      id: 8,
      projectName: 'Patient Monitors',
      vendor: 'VitalSign Medical',
      callDate: '18 Jan 2026',
      callTime: '16:00',
      duration: '29 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6% discount for 10 units',
        'Wireless connectivity included',
        '3-year comprehensive warranty',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Priya, thank you for joining.' },
        { speaker: 'Priya Sharma', time: '00:15', text: 'Good afternoon. Our monitors offer the best value.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'For 10 units, can you offer a package deal?' },
        { speaker: 'Priya Sharma', time: '00:50', text: 'Yes, ₹5,40,000 for 10 units with 3-year warranty.' },
      ],
    },
    {
      id: 9,
      projectName: 'Wheelchairs & Mobility Aids',
      vendor: 'Mobility First India',
      callDate: '18 Jan 2026',
      callTime: '11:30',
      duration: '18 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 7.4% discount for bulk order',
        '30 wheelchairs with foldable design',
        'Free delivery and assembly',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Suresh, let\'s discuss the wheelchair procurement.' },
        { speaker: 'Suresh Menon', time: '00:12', text: 'Good morning. Our foldable wheelchairs are perfect.' },
        { speaker: 'Ram Krish', time: '00:25', text: 'For 30 units, what\'s your best price?' },
        { speaker: 'Suresh Menon', time: '00:40', text: '₹1,25,000 for 30 units with free delivery.' },
      ],
    },
    {
      id: 10,
      projectName: 'Blood Pressure Monitors',
      vendor: 'HealthCare Diagnostics',
      callDate: '17 Jan 2026',
      callTime: '15:15',
      duration: '24 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6.8% discount',
        'Digital monitors with memory function',
        '2-year warranty on all units',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Vikas, thank you for the BP monitor quotation.' },
        { speaker: 'Vikas Gupta', time: '00:12', text: 'Good afternoon. Our digital monitors are highly accurate.' },
        { speaker: 'Ram Krish', time: '00:28', text: 'Can you offer a discount for 50 units?' },
        { speaker: 'Vikas Gupta', time: '00:45', text: 'Yes, ₹95,000 for 50 units with 2-year warranty.' },
      ],
    },
    {
      id: 11,
      projectName: 'Sterilization Equipment',
      vendor: 'SteriliTech India',
      callDate: '17 Jan 2026',
      callTime: '10:45',
      duration: '37 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated ₹25,000 discount',
        'Autoclave with digital controls',
        'Free installation and training',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Karthik, let\'s discuss the sterilization equipment.' },
        { speaker: 'Karthik', time: '00:15', text: 'Good morning. Our autoclave systems are hospital-grade.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'Can you include installation?' },
        { speaker: 'Karthik', time: '00:55', text: 'Yes, ₹3,85,000 with free installation and training.' },
      ],
    },
    {
      id: 12,
      projectName: 'Infusion Pumps',
      vendor: 'InfuCare Medical',
      callDate: '16 Jan 2026',
      callTime: '13:30',
      duration: '31 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 5.9% discount',
        '15 infusion pumps with smart features',
        '3-year warranty and maintenance',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Venkat, thank you for the infusion pump proposal.' },
        { speaker: 'Venkat Rao', time: '00:15', text: 'Good afternoon. Our smart infusion pumps are very reliable.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'For 15 units, can you offer extended warranty?' },
        { speaker: 'Venkat Rao', time: '00:55', text: 'Yes, ₹4,75,000 for 15 units with 3-year warranty.' },
      ],
    },
    {
      id: 13,
      projectName: 'Nebulizers',
      vendor: 'RespiroCare Solutions',
      callDate: '16 Jan 2026',
      callTime: '09:00',
      duration: '20 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6.8% discount',
        '40 portable nebulizers',
        'Free carrying cases',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Sudip, let\'s finalize the nebulizer order.' },
        { speaker: 'Sudip Das', time: '00:12', text: 'Good morning. Our portable nebulizers are perfect.' },
        { speaker: 'Ram Krish', time: '00:28', text: 'Can you include carrying cases?' },
        { speaker: 'Sudip Das', time: '00:45', text: 'Yes, ₹68,000 for 40 units with free cases.' },
      ],
    },
    {
      id: 14,
      projectName: 'X-Ray Machine',
      vendor: 'RadiTech Imaging',
      callDate: '15 Jan 2026',
      callTime: '14:00',
      duration: '45 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated ₹1,00,000 discount',
        'Digital X-Ray with PACS integration',
        'Free installation and 5-year warranty',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Niranjan, thank you for the X-Ray proposal.' },
        { speaker: 'Niranjan Shah', time: '00:15', text: 'Good afternoon. Our digital X-Ray system is state-of-the-art.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'Can you include PACS integration?' },
        { speaker: 'Niranjan Shah', time: '01:00', text: 'Yes, ₹18,50,000 with PACS and 5-year warranty.' },
      ],
    },
    {
      id: 15,
      projectName: 'Defibrillators',
      vendor: 'CardioSave Equipment',
      callDate: '15 Jan 2026',
      callTime: '11:00',
      duration: '27 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 5.8% discount',
        '5 AED units with wall mounts',
        'Staff training included',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Anil, let\'s discuss the defibrillator order.' },
        { speaker: 'Anil Kumar', time: '00:12', text: 'Good morning. Our AEDs are easy to use and reliable.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'Can you include wall mounts and training?' },
        { speaker: 'Anil Kumar', time: '00:50', text: 'Yes, ₹3,25,000 for 5 units with mounts and training.' },
      ],
    },
    {
      id: 16,
      projectName: 'Ventilators',
      vendor: 'RespiraTech Medical',
      callDate: '14 Jan 2026',
      callTime: '16:30',
      duration: '40 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 5% discount',
        '3 ICU ventilators with advanced modes',
        'Comprehensive training and support',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Manoj, thank you for the ventilator proposal.' },
        { speaker: 'Manoj Patil', time: '00:15', text: 'Good afternoon. Our ICU ventilators have the latest technology.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'For 3 units, can you offer training?' },
        { speaker: 'Manoj Patil', time: '01:00', text: 'Yes, ₹14,25,000 for 3 units with comprehensive training.' },
      ],
    },
    {
      id: 17,
      projectName: 'Dialysis Machines',
      vendor: 'NephroMed Solutions',
      callDate: '14 Jan 2026',
      callTime: '10:30',
      duration: '38 min',
      participants: 3,
      status: 'active',
      outcome: 'In Progress',
      keyPoints: [
        'Discussing 5% discount',
        '4 hemodialysis machines',
        'Negotiating 5-year warranty terms',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Sandeep, let\'s discuss the dialysis procurement.' },
        { speaker: 'Sandeep Nair', time: '00:15', text: 'Good morning. Our hemodialysis machines are highly efficient.' },
        { speaker: 'Ram Krish', time: '00:35', text: 'Can you offer a package deal with warranty?' },
        { speaker: 'Sandeep Nair', time: '01:00', text: 'Let me prepare a revised proposal with extended warranty.' },
      ],
    },
    {
      id: 18,
      projectName: 'Hospital Beds',
      vendor: 'MediBed Industries',
      callDate: '13 Jan 2026',
      callTime: '15:45',
      duration: '25 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6.4% discount',
        '20 electric hospital beds',
        'Free mattresses and side rails',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Suresh, thank you for the hospital bed quotation.' },
        { speaker: 'Suresh Kumar', time: '00:15', text: 'Good afternoon. Our electric beds have excellent features.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'Can you include mattresses for 20 beds?' },
        { speaker: 'Suresh Kumar', time: '00:50', text: 'Yes, ₹5,85,000 for 20 beds with free mattresses.' },
      ],
    },
    {
      id: 19,
      projectName: 'Syringe Pumps',
      vendor: 'InfuTech Medical',
      callDate: '13 Jan 2026',
      callTime: '11:15',
      duration: '23 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6.5% discount',
        '20 syringe pumps with alarms',
        '2-year warranty',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good morning Ram Mohan, let\'s finalize the syringe pump order.' },
        { speaker: 'Ram Mohan', time: '00:12', text: 'Good morning. Our syringe pumps are very precise.' },
        { speaker: 'Ram Krish', time: '00:30', text: 'For 20 units, can you offer a volume discount?' },
        { speaker: 'Ram Mohan', time: '00:48', text: 'Yes, ₹2,15,000 for 20 units with 2-year warranty.' },
      ],
    },
    {
      id: 20,
      projectName: 'Pulse Oximeters',
      vendor: 'OxyMed Devices',
      callDate: '12 Jan 2026',
      callTime: '14:20',
      duration: '17 min',
      participants: 3,
      status: 'completed',
      outcome: 'Deal Agreed',
      keyPoints: [
        'Negotiated 6.7% discount',
        '100 fingertip pulse oximeters',
        'Free batteries included',
      ],
      transcript: [
        { speaker: 'AI Agent', time: '00:00', text: 'Good afternoon Arindam, thank you for the pulse oximeter quote.' },
        { speaker: 'Arindam Chowdhury', time: '00:12', text: 'Good afternoon. Our fingertip oximeters are highly accurate.' },
        { speaker: 'Ram Krish', time: '00:25', text: 'For 100 units, can you include batteries?' },
        { speaker: 'Arindam Chowdhury', time: '00:40', text: 'Yes, ₹42,000 for 100 units with free batteries.' },
      ],
    },
  ];

  const emailThreads = [
    {
      id: 101,
      vendor: 'Advanced Imaging Systems',
      email: 'info@advancedimaging.com',
      subject: 'MRI Scanner Price Negotiation',
      lastMessage: '23 Jan 2026',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@advancedimaging.com',
          timestamp: '23 Jan 2026 09:15',
          message: 'Thank you for the detailed quotation. Can we discuss reducing the price for a long-term service contract?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@advancedimaging.com',
          fromName: 'Advanced Imaging Systems',
          to: 'procurement@company.com',
          timestamp: '23 Jan 2026 10:30',
          message: 'We can offer ₹85,00,000 with a 7-year comprehensive warranty and annual service.',
          type: 'received',
        },
      ],
    },
    {
      id: 102,
      vendor: 'AnesthCare Equipment',
      email: 'sales@anesthcare.com',
      subject: 'Anesthesia Machine Bulk Order',
      lastMessage: '23 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@anesthcare.com',
          timestamp: '23 Jan 2026 11:00',
          message: 'We need 3 advanced anesthesia machines. Can you include training?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@anesthcare.com',
          fromName: 'AnesthCare Equipment',
          to: 'procurement@company.com',
          timestamp: '23 Jan 2026 13:45',
          message: 'Yes, ₹13,50,000 for 3 units with complimentary training and 2-year warranty.',
          type: 'received',
        },
      ],
    },
    {
      id: 103,
      vendor: 'LabSpin Technologies',
      email: 'contact@labspin.com',
      subject: 'Laboratory Centrifuge Package Deal',
      lastMessage: '22 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@labspin.com',
          timestamp: '22 Jan 2026 15:30',
          message: 'We need refrigerated centrifuges for our lab. Can you offer a package price?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@labspin.com',
          fromName: 'LabSpin Technologies',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 17:20',
          message: 'Yes, ₹2,35,000 for 5 units with 3-year warranty and free installation.',
          type: 'received',
        },
      ],
    },
    {
      id: 104,
      vendor: 'Global Electronics Supply',
      email: 'info@globalsupply.com',
      subject: 'Volume Discount Discussion',
      lastMessage: '22 Jan 2026',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@globalsupply.com',
          timestamp: '22 Jan 2026 16:30',
          message: 'Can we discuss additional volume discounts beyond the 7% already negotiated?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@globalsupply.com',
          fromName: 'Global Electronics Supply',
          to: 'procurement@company.com',
          timestamp: '22 Jan 2026 18:15',
          message: 'For a 2-year commitment with quarterly orders, we can extend the discount to 8.5%.',
          type: 'received',
        },
      ],
    },
    {
      id: 105,
      vendor: 'HealthCare Innovations',
      email: 'sales@healthcareinnovations.com',
      subject: 'Certification Requirements',
      lastMessage: '20 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@healthcareinnovations.com',
          timestamp: '20 Jan 2026 11:15',
          message: 'Can you provide updated ISO and FDA certification documents?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@healthcareinnovations.com',
          fromName: 'HealthCare Innovations',
          to: 'procurement@company.com',
          timestamp: '20 Jan 2026 12:30',
          message: 'Absolutely. I will send the updated certificates by end of day.',
          type: 'received',
        },
      ],
    },
    {
      id: 106,
      vendor: 'Surgical Equipment Ltd',
      email: 'info@surgicalequip.com',
      subject: 'Exclusive Partnership Terms',
      lastMessage: '19 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@surgicalequip.com',
          timestamp: '19 Jan 2026 11:00',
          message: 'We are considering an exclusive 2-year partnership. What additional benefits can you offer?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@surgicalequip.com',
          fromName: 'Surgical Equipment Ltd',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 14:20',
          message: 'For exclusive partnership, we offer 12% discount, priority shipping, and dedicated account manager.',
          type: 'received',
        },
      ],
    },
    {
      id: 107,
      vendor: 'Medical Devices Corp',
      email: 'info@meddevicescorp.com',
      subject: 'Shipping Cost Negotiation',
      lastMessage: '19 Jan 2026',
      status: 'active',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@meddevicescorp.com',
          timestamp: '19 Jan 2026 08:30',
          message: 'The shipping costs seem high. Can we negotiate this down?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@meddevicescorp.com',
          fromName: 'Medical Devices Corp',
          to: 'procurement@company.com',
          timestamp: '19 Jan 2026 11:15',
          message: 'We can reduce shipping by 25% if you consolidate orders to bi-weekly shipments.',
          type: 'received',
        },
      ],
    },
    {
      id: 108,
      vendor: 'PharmaSupply Global',
      email: 'orders@pharmasupplyglobal.com',
      subject: 'Extended Payment Terms',
      lastMessage: '18 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@pharmasupplyglobal.com',
          timestamp: '18 Jan 2026 10:00',
          message: 'Can we extend payment terms to Net 60 days?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@pharmasupplyglobal.com',
          fromName: 'PharmaSupply Global',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 15:30',
          message: 'We can approve Net 60 days with a 2% early payment discount if paid within 30 days.',
          type: 'received',
        },
      ],
    },
    {
      id: 109,
      vendor: 'Lab Equipment Solutions',
      email: 'support@labequipmentsolutions.com',
      subject: 'Warranty Extension Proposal',
      lastMessage: '18 Jan 2026',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'support@labequipmentsolutions.com',
          timestamp: '17 Jan 2026 16:00',
          message: 'Can we extend the standard 2-year warranty to 4 years?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'support@labequipmentsolutions.com',
          fromName: 'Lab Equipment Solutions',
          to: 'procurement@company.com',
          timestamp: '18 Jan 2026 09:20',
          message: 'Extended 4-year warranty is available for an additional 6% of the total order value.',
          type: 'received',
        },
      ],
    },
    {
      id: 110,
      vendor: 'Diagnostic Supplies India',
      email: 'sales@diagnosticsupplies.in',
      subject: 'Volume Commitment Agreement',
      lastMessage: '17 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@diagnosticsupplies.in',
          timestamp: '17 Jan 2026 11:00',
          message: 'We can commit to quarterly orders of minimum 50,000 units. What pricing can you offer?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@diagnosticsupplies.in',
          fromName: 'Diagnostic Supplies India',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 14:45',
          message: 'With quarterly commitment, we offer ₹145 per unit (15% off) with guaranteed stock availability.',
          type: 'received',
        },
      ],
    },
    {
      id: 111,
      vendor: 'MediCare Distributors',
      email: 'contact@medicaredist.com',
      subject: 'Rush Order Premium Waiver',
      lastMessage: '17 Jan 2026',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@medicaredist.com',
          timestamp: '16 Jan 2026 15:00',
          message: 'We have an urgent requirement for 10,000 units within 7 days. Can you waive the rush premium?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@medicaredist.com',
          fromName: 'MediCare Distributors',
          to: 'procurement@company.com',
          timestamp: '17 Jan 2026 10:30',
          message: 'We can waive 50% of the rush premium if you commit to regular monthly orders for 6 months.',
          type: 'received',
        },
      ],
    },
    {
      id: 112,
      vendor: 'Advanced Medical Systems',
      email: 'info@advancedmed.com',
      subject: 'Training & Installation Costs',
      lastMessage: '16 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@advancedmed.com',
          timestamp: '16 Jan 2026 09:00',
          message: 'Can you include training and installation in the base price?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@advancedmed.com',
          fromName: 'Advanced Medical Systems',
          to: 'procurement@company.com',
          timestamp: '16 Jan 2026 12:15',
          message: 'Yes, we can include both training and installation at no extra cost for orders above ₹5 lakhs.',
          type: 'received',
        },
      ],
    },
    {
      id: 113,
      vendor: 'BioMedical Supplies',
      email: 'orders@biomedical.com',
      subject: 'Bulk Order Pricing',
      lastMessage: '15 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@biomedical.com',
          timestamp: '15 Jan 2026 14:30',
          message: 'What\'s your best price for an order of 100,000 units?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@biomedical.com',
          fromName: 'BioMedical Supplies',
          to: 'procurement@company.com',
          timestamp: '15 Jan 2026 16:45',
          message: 'For 100,000 units, we can offer ₹85 per unit with free shipping.',
          type: 'received',
        },
      ],
    },
    {
      id: 114,
      vendor: 'MedEquip International',
      email: 'sales@medequip.com',
      subject: 'Service Contract Terms',
      lastMessage: '15 Jan 2026',
      status: 'active',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@medequip.com',
          timestamp: '14 Jan 2026 11:00',
          message: 'Can you provide details on your annual maintenance contract?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@medequip.com',
          fromName: 'MedEquip International',
          to: 'procurement@company.com',
          timestamp: '15 Jan 2026 09:30',
          message: 'Our AMC is 8% of equipment value annually, covering all parts and quarterly servicing.',
          type: 'received',
        },
      ],
    },
    {
      id: 115,
      vendor: 'TechMed Solutions',
      email: 'contact@techmed.com',
      subject: 'Customization Request',
      lastMessage: '14 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'contact@techmed.com',
          timestamp: '14 Jan 2026 10:00',
          message: 'Can you customize the software interface for our specific workflow?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'contact@techmed.com',
          fromName: 'TechMed Solutions',
          to: 'procurement@company.com',
          timestamp: '14 Jan 2026 13:30',
          message: 'Yes, we can provide custom interface development for an additional ₹50,000.',
          type: 'received',
        },
      ],
    },
    {
      id: 116,
      vendor: 'HealthTech Devices',
      email: 'info@healthtech.com',
      subject: 'Demo Unit Request',
      lastMessage: '13 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@healthtech.com',
          timestamp: '13 Jan 2026 15:00',
          message: 'Can you provide a demo unit for 30-day evaluation before we commit to bulk order?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@healthtech.com',
          fromName: 'HealthTech Devices',
          to: 'procurement@company.com',
          timestamp: '13 Jan 2026 17:30',
          message: 'Yes, we can provide a demo unit at no cost for 30-day evaluation.',
          type: 'received',
        },
      ],
    },
    {
      id: 117,
      vendor: 'Precision Instruments',
      email: 'sales@precisioninst.com',
      subject: 'Calibration Services',
      lastMessage: '12 Jan 2026',
      status: 'active',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'sales@precisioninst.com',
          timestamp: '12 Jan 2026 11:30',
          message: 'What calibration services do you offer post-installation?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'sales@precisioninst.com',
          fromName: 'Precision Instruments',
          to: 'procurement@company.com',
          timestamp: '12 Jan 2026 14:15',
          message: 'We offer quarterly calibration services for the first year at no additional cost.',
          type: 'received',
        },
      ],
    },
    {
      id: 118,
      vendor: 'MedSupplies Direct',
      email: 'orders@medsuppliesdirect.com',
      subject: 'Consignment Stock Arrangement',
      lastMessage: '11 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'orders@medsuppliesdirect.com',
          timestamp: '11 Jan 2026 09:00',
          message: 'Can we set up a consignment stock arrangement for emergency supplies?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'orders@medsuppliesdirect.com',
          fromName: 'MedSupplies Direct',
          to: 'procurement@company.com',
          timestamp: '11 Jan 2026 11:45',
          message: 'Yes, we can maintain ₹2 lakh worth of consignment stock with 30-day payment terms.',
          type: 'received',
        },
      ],
    },
    {
      id: 119,
      vendor: 'Clinical Devices Inc',
      email: 'info@clinicaldevices.com',
      subject: 'Trade-in Program',
      lastMessage: '10 Jan 2026',
      status: 'completed',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'info@clinicaldevices.com',
          timestamp: '10 Jan 2026 14:00',
          message: 'Do you have a trade-in program for our old equipment?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'info@clinicaldevices.com',
          fromName: 'Clinical Devices Inc',
          to: 'procurement@company.com',
          timestamp: '10 Jan 2026 16:30',
          message: 'Yes, we can offer up to 20% of new equipment value as trade-in credit for functional units.',
          type: 'received',
        },
      ],
    },
    {
      id: 120,
      vendor: 'Medical Systems Pro',
      email: 'support@medsyspro.com',
      subject: 'Spare Parts Availability',
      lastMessage: '09 Jan 2026',
      status: 'active',
      priority: 'high',
      messages: [
        {
          id: 1,
          from: 'procurement@company.com',
          fromName: 'You',
          to: 'support@medsyspro.com',
          timestamp: '09 Jan 2026 10:00',
          message: 'What is your spare parts availability and delivery timeline?',
          type: 'sent',
        },
        {
          id: 2,
          from: 'support@medsyspro.com',
          fromName: 'Medical Systems Pro',
          to: 'procurement@company.com',
          timestamp: '09 Jan 2026 12:45',
          message: 'We maintain 95% spare parts inventory with 24-48 hour delivery for critical components.',
          type: 'received',
        },
      ],
    },
  ];

  const [selectedCall, setSelectedCall] = useState<any>(negotiationCalls[0]);
  const [selectedEmailThread, setSelectedEmailThread] = useState<any>(null);
  const [emailThreadOpen, setEmailThreadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'email'>('voice');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDownloadRecording = (recordingPath: string) => {
    toast.success('Recording downloaded successfully');
  };

  const handlePlayRecording = () => {
    toast.success('Playing recording...');
  };

  return (
    <div className="min-h-screen bg-[rgb(255,255,255)]">
      <div className="bg-white rounded-2xl p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Negotiations</h1>
          <p className="text-sm text-gray-500">Collective negotiations across all procurement projects</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'voice'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Voice Calls</span>
            </div>
            {activeTab === 'voice' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'email'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Email Threads</span>
            </div>
            {activeTab === 'email' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        </div>

        {/* Voice Calls Tab */}
        {activeTab === 'voice' && (
          <div className="grid grid-cols-12 gap-4">
            {/* Calls List */}
            <div className="col-span-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {negotiationCalls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`w-full text-left p-4 rounded-lg transition-all border ${
                    selectedCall?.id === call.id
                      ? 'bg-white border-[#3B82F6] shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">{call.vendor}</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{call.callDate} {call.callTime}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs px-2 py-0.5 border-0 ${
                      call.status === 'active'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {call.outcome}
                    </Badge>
                    <span className="text-xs text-gray-500">{call.duration}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Call Details */}
            <div className="col-span-8 border border-gray-200 rounded-lg bg-white max-h-[calc(100vh-200px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{selectedCall.vendor}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {selectedCall.callDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedCall.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Ram Krish, AI Agent, Sandeep Kumar
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50">
                    Download
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Key Points */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Points</h4>
                  <div className="space-y-2">
                    {selectedCall.keyPoints.map((point: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 bg-gray-100 p-3 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Transcript</h4>
                  <div className="space-y-3">
                    {selectedCall.transcript.map((entry: any, idx: number) => (
                      <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900">{entry.speaker}</p>
                          <p className="text-xs text-gray-400">{entry.time}</p>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Threads Tab */}
        {activeTab === 'email' && (
          <>
            {/* Gmail-style Email List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[calc(100vh-200px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {emailThreads.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {emailThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => {
                        setSelectedEmailThread(thread);
                        setEmailThreadOpen(true);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group text-left"
                    >
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        {thread.status === 'active' ? (
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2"></div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {thread.vendor.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-sm ${thread.status === 'active' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {thread.vendor}
                          </span>
                          {thread.priority === 'high' && (
                            <Badge className="text-xs px-1.5 py-0 border-0 bg-red-50 text-red-700">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${thread.status === 'active' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {thread.subject}
                          </span>
                          <span className="text-sm text-gray-500">-</span>
                          <span className="text-sm text-gray-500 truncate">
                            {thread.messages[thread.messages.length - 1].message.substring(0, 60)}...
                          </span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex-shrink-0 text-xs text-gray-500">
                        {thread.lastMessage.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-500">No email threads found</p>
                </div>
              )}
            </div>

            {/* Gmail-style Email Thread Side Panel */}
            {emailThreadOpen && selectedEmailThread && createPortal(
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999, isolation: 'isolate' }}>
                {/* Overlay */}
                <div 
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setEmailThreadOpen(false)}
                />
                
                {/* Side Panel */}
                <div className="absolute top-0 right-0 h-full w-[700px] bg-white shadow-lg flex flex-col" style={{ zIndex: 1 }}>
                  {/* Header */}
                  <div className="bg-white border-b border-[#eeeff1] px-6 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{selectedEmailThread.subject}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedEmailThread.email}</p>
                    </div>
                    <button
                      onClick={() => setEmailThreadOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Email Thread Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {selectedEmailThread.messages.map((message: any, index: number) => (
                      <div key={message.id} className={`mb-6 ${index === selectedEmailThread.messages.length - 1 ? 'mb-0' : ''}`}>
                        {/* Message Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.type === 'sent' ? 'bg-[#3B82F6]' : 'bg-gray-300'
                          }`}>
                            <span className={`text-sm font-medium ${message.type === 'sent' ? 'text-white' : 'text-gray-700'}`}>
                              {message.fromName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-900">{message.type === 'sent' ? 'Ram Krish' : message.fromName}</span>
                              <span className="text-xs text-gray-500">{message.timestamp}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">to {message.type === 'sent' ? message.to : message.from}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{message.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Area */}
                  <div className="border-t border-[#eeeff1] p-4">
                    <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white h-10">
                      Reply
                    </Button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        )}
      </div>
    </div>
  );
}