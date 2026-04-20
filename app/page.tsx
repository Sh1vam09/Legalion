"use client";

import { useState } from 'react'; // Added for form state
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, // Added for form
  CardContent,
  CardFooter // Added for form
} from '@/components/ui/card';
import { Label } from '@/components/ui/label'; // Added for form
import { Input } from '@/components/ui/input'; // Added for form
import { Textarea } from '@/components/ui/textarea'; // Added for form
import { Navigation } from '@/components/navigation';
import { 
  ArrowRight, 
  Shield, 
  Zap,
  ScanText,
  Files,
  Mail // Kept for button
} from 'lucide-react';

const features = [
  {
    icon: ScanText,
    title: "AI-Powered Analysis",
    description: "Extracts clauses, identifies ambiguities, and performs a comprehensive risk analysis. You can even ask the AI questions about your document."
  },
  {
    icon: Shield,
    title: "Risk Assessment",
    description: "Identify potential risks and vulnerabilities in your contracts"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get comprehensive analysis results in seconds, not hours"
  },
  {
    icon: Files,
    title: "Multiple Formats",
    description: "Support for PDF, DOC, and other common document formats"
  }
];

const stats = [
  { value: "10+", label: "Contracts Analyzed" },
  { value: "95%", label: "Accuracy Rate" },
  { value: "5", label: "Risk Categories" },
  { value: "24/7", label: "Support Available" }
];

export default function Home() {
  // State for the contact form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');

  // Handles opening the user's mail client with pre-filled info
  const handleSendMail = () => {
    const subject = encodeURIComponent(`Inquiry from ${name} - Legalion`);
    const body = encodeURIComponent(
      `Name: ${name}\nContact Email: ${email}\n\nQuery:\n${query}`
    );
    // Change "support@legalion.com" to your actual support email
    window.location.href = `mailto:support@legalion.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="text-primary">Maharashtra Redevlopment Contract</span>
                <br />
                <span className="text-foreground">Analysis Platform</span>
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
            >
              Leverage AI to analyze redevelopment contracts, identify risks, and make informed decisions with confidence
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link href="/upload">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Start Analysis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                  View Demo
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="rounded-2xl border bg-card text-card-foreground shadow-sm p-8 max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground text-sm md:text-base">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Powerful Features for <span className="text-primary">Smart Analysis</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines cutting-edge AI with legal expertise to deliver unparalleled contract analysis
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Card className="h-full transition-all duration-300 group-hover:shadow-xl">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NEW Contact Section with Form */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Get in <span className="text-primary">Touch</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Have questions or ready to get started? Fill out the form below.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <Card>
              <CardHeader>
                <CardTitle>Contact Form</CardTitle>
                <CardDescription>
                  We'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Your Name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Contact Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query">Your Query</Label>
                  <Textarea 
                    id="query" 
                    placeholder="How can we help you?" 
                    rows={5}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSendMail}>
                  <Mail className="mr-2 w-4 h-4" />
                  Send Mail
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </section>

    </div>
  );
}