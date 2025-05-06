import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  ExternalLink, 
  Search, 
  Github, 
  Twitter, 
  Linkedin, 
  Youtube,
  Mail,
  ArrowDownCircle,
  Sparkles,
  Rocket,
  Globe,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function DocsPage() {
  // States for page navigation and views
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "docs" | "about">("landing");
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 3;
  
  // Filter documentation sections based on search query
  const filterContent = (content: string) => {
    if (!searchQuery) return true;
    return content.toLowerCase().includes(searchQuery.toLowerCase());
  };
  
  // Navigation functions
  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };
  
  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };
  
  // Animation variants
  const iconAnimation = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.1
      } 
    }
  };
  
  const textAnimation = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.2
      } 
    }
  };

  return (
    <AppLayout>
      {/* Nav buttons for top right */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {currentView !== "docs" && (
          <Button 
            onClick={() => setCurrentView("docs")} 
            variant="outline" 
            size="sm" 
            className="gap-1 bg-card/80 backdrop-blur-sm border shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
            <span>Documentation</span>
          </Button>
        )}
        
        {currentView !== "about" && (
          <Button 
            onClick={() => setCurrentView("about")} 
            variant="outline" 
            size="sm"
            className="gap-1 bg-card/80 backdrop-blur-sm border shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
            <span>About</span>
          </Button>
        )}
        
        {currentView !== "landing" && (
          <Button 
            onClick={() => setCurrentView("landing")} 
            variant="outline" 
            size="sm"
            className="gap-1 bg-card/80 backdrop-blur-sm border shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        )}
      </div>
      
      {/* Landing Page View */}
      {currentView === "landing" && (
        <>
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/20">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            </div>
            
            <div className="container relative mx-auto px-6 py-24 md:py-36 flex flex-col items-center text-center z-10">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={iconAnimation}
                className="mb-6 relative"
              >
                <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl animate-pulse"></div>
                <div className="relative w-16 h-16 md:w-24 md:h-24 flex items-center justify-center bg-primary/20 text-primary rounded-full">
                  <Sparkles className="w-8 h-8 md:w-12 md:h-12" />
                </div>
              </motion.div>
              
              <motion.h1 
                initial="hidden"
                animate="visible"
                variants={textAnimation}
                className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 dark:from-primary dark:to-indigo-400"
              >
                RunAI
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-xl md:text-2xl text-foreground/80 max-w-3xl mb-8"
              >
                The intelligent automation platform that connects your workflows, APIs, and data with the power of AI
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button size="lg" className="gap-2">
                  <Rocket className="w-4 h-4" />
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <ArrowDownCircle className="w-4 h-4" />
                  View Demos
                </Button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl w-full"
              >
                <div className="flex flex-col items-center p-6 bg-card border rounded-lg shadow-sm">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Build Faster</h3>
                  <p className="text-center text-muted-foreground">Create powerful workflows in minutes, not days, with our intuitive visual builder.</p>
                </div>
                
                <div className="flex flex-col items-center p-6 bg-card border rounded-lg shadow-sm">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Connect Everything</h3>
                  <p className="text-center text-muted-foreground">Integrate with hundreds of APIs and services with just a few clicks.</p>
                </div>
                
                <div className="flex flex-col items-center p-6 bg-card border rounded-lg shadow-sm">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                    <Rocket className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Scale Effortlessly</h3>
                  <p className="text-center text-muted-foreground">From startups to enterprises, our platform grows with your needs.</p>
                </div>
              </motion.div>
              
              {/* Page Navigation Dots & Arrows */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-16 mb-8"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-8">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={prevPage}
                      className="rounded-full h-10 w-10 p-0 bg-primary/10 hover:bg-primary/20"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    
                    <div className="flex gap-3">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`h-3 w-3 rounded-full transition-all ${
                            currentPage === i 
                              ? "bg-primary w-6" 
                              : "bg-primary/30 hover:bg-primary/50"
                          }`}
                          aria-label={`Go to page ${i + 1}`}
                        />
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={nextPage}
                      className="rounded-full h-10 w-10 p-0 bg-primary/10 hover:bg-primary/20"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <a 
                    onClick={() => setCurrentView("docs")} 
                    className="inline-flex items-center justify-center gap-2 cursor-pointer hover:text-primary transition-colors text-muted-foreground"
                  >
                    <span>Skip to Documentation</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="bg-primary/5 dark:bg-primary/10 border-y">
            <div className="container mx-auto py-8 px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold mb-2">Connect with us</h3>
                  <p className="text-muted-foreground">Join our community and stay updated</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Github className="w-5 h-5" />
                    <span>Github</span>
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Twitter className="w-5 h-5" />
                    <span>Twitter</span>
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Linkedin className="w-5 h-5" />
                    <span>LinkedIn</span>
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Youtube className="w-5 h-5" />
                    <span>YouTube</span>
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Mail className="w-5 h-5" />
                    <span>Newsletter</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Documentation Content View */}
      {currentView === "docs" && (
        <div id="docs-content" className="container mx-auto p-6 max-w-7xl">
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Documentation</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Learn how to get the most out of RunAI, our automation and integration platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mb-10">
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                <span>Advanced Search</span>
              </Button>
            </div>

            <Tabs defaultValue="getting-started" className="w-full">
              <TabsList className="w-full justify-start mb-6 bg-transparent p-0 border-b">
                <TabsTrigger value="getting-started" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                  Getting Started
                </TabsTrigger>
                <TabsTrigger value="flows" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                  Flow Builder
                </TabsTrigger>
                <TabsTrigger value="connectors" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                  Connectors
                </TabsTrigger>
                <TabsTrigger value="tables" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                  Tables
                </TabsTrigger>
                <TabsTrigger value="api" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
                  API Reference
                </TabsTrigger>
                <TabsTrigger 
                  value="about" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
                  onClick={() => setCurrentView("about")}
                >
                  About
                </TabsTrigger>
              </TabsList>

              <TabsContent value="getting-started" className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Introduction to RunAI</CardTitle>
                      <CardDescription>Learn what RunAI is and how it can help you automate workflows</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        RunAI is a powerful automation platform that enables you to connect different services and automate workflows without coding.
                      </p>
                      <Button variant="link" className="p-0 flex items-center gap-2">
                        <span>Read Introduction</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Start Guide</CardTitle>
                      <CardDescription>Set up your first flow in under 5 minutes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Follow our step-by-step guide to create your first automation flow and start seeing results immediately.
                      </p>
                      <Button variant="link" className="p-0 flex items-center gap-2">
                        <span>View Quick Start</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <h2 className="text-2xl font-bold tracking-tight">Core Concepts</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Flows</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          Flows are automated workflows that connect different services and execute tasks in a specific order.
                        </p>
                        <Button variant="link" className="p-0 flex items-center gap-2">
                          <span>Learn about Flows</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Connectors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          Connectors let you integrate with external services like APIs, databases, and third-party platforms.
                        </p>
                        <Button variant="link" className="p-0 flex items-center gap-2">
                          <span>Explore Connectors</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Tables</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          Tables provide a structured way to store, manage, and access data within your workflows.
                        </p>
                        <Button variant="link" className="p-0 flex items-center gap-2">
                          <span>Understand Tables</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="bg-primary/5 p-6 rounded-lg border">
                  <h3 className="text-xl font-bold mb-4">Need Help?</h3>
                  <p className="mb-4">Can't find what you're looking for? Our support team is here to help.</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button>Contact Support</Button>
                    <Button variant="outline">Visit Community Forums</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      
      {/* About View */}
      {currentView === "about" && (
        <div className="container mx-auto p-6 max-w-7xl">
          <section className="max-w-4xl mx-auto space-y-12">
            <div className="flex flex-col-reverse md:flex-row gap-10">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold tracking-tight mb-6">Our Mission</h2>
                <p className="text-muted-foreground mb-4 text-lg">
                  At RunAI, we're committed to democratizing automation and making powerful workflow integrations accessible to everyone, regardless of their technical expertise.
                </p>
                <p className="text-muted-foreground mb-4 text-lg">
                  We believe that by removing technical barriers, we can empower businesses of all sizes to automate their processes, connect their tools, and focus on what truly matters: innovation and growth.
                </p>
                <p className="text-muted-foreground mb-8 text-lg">
                  Our platform is built with simplicity and power in mind, providing an intuitive visual interface that hides complexity while enabling sophisticated automations.
                </p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex gap-4"
                >
                  <Button className="gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </Button>
                  <Button variant="outline">Our Story</Button>
                </motion.div>
              </div>
              
              <div className="md:w-1/2 relative">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl overflow-hidden p-8 h-full"
                >
                  <div className="relative z-10 h-full flex flex-col justify-center">
                    <h3 className="text-2xl font-bold mb-4">Our Values</h3>
                    <ul className="space-y-4">
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex items-start gap-3"
                      >
                        <div className="bg-primary/20 p-1 rounded-full mt-1">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold">Innovation</span>
                          <p className="text-muted-foreground mt-1">Continuously pushing the boundaries of what's possible.</p>
                        </div>
                      </motion.li>
                      
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="flex items-start gap-3"
                      >
                        <div className="bg-primary/20 p-1 rounded-full mt-1">
                          <Rocket className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold">Empowerment</span>
                          <p className="text-muted-foreground mt-1">Enabling everyone to achieve more through automation.</p>
                        </div>
                      </motion.li>
                      
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex items-start gap-3"
                      >
                        <div className="bg-primary/20 p-1 rounded-full mt-1">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold">Connection</span>
                          <p className="text-muted-foreground mt-1">Building bridges between tools, systems, and people.</p>
                        </div>
                      </motion.li>
                    </ul>
                  </div>
                  
                  <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent)]"></div>
                </motion.div>
              </div>
            </div>
            
            <section className="bg-primary/5 dark:bg-primary/10 p-8 md:p-16 rounded-2xl border relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent)]"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold tracking-tight mb-6 text-center">Join Our Community</h2>
                <p className="text-center text-lg text-muted-foreground mb-10 max-w-3xl mx-auto">
                  Connect with other RunAI users, share your workflow recipes, get help, and stay up to date with the latest features and updates.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="bg-card p-6 rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Github className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">GitHub</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">Explore our open-source components, submit issues, and contribute to the platform.</p>
                    <Button variant="outline" className="w-full">Visit GitHub</Button>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-card p-6 rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Twitter className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">Twitter</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">Follow us for product updates, automation tips, and to join the conversation.</p>
                    <Button variant="outline" className="w-full">Follow @RunAI</Button>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-card p-6 rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">Newsletter</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">Subscribe to our monthly newsletter for product updates and automation insights.</p>
                    <div className="flex gap-2">
                      <Input placeholder="Your email address" />
                      <Button>Subscribe</Button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
            
            <section className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Meet the Team</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We're a diverse team of engineers, designers, and product thinkers passionate about making automation accessible to everyone.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (i * 0.1), duration: 0.5 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-32 h-32 rounded-full bg-primary/10 mb-4 overflow-hidden flex items-center justify-center">
                      <div className="text-5xl font-bold text-primary/50">
                        {String.fromCharCode(64 + i)}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-1">Team Member {i}</h3>
                    <p className="text-muted-foreground mb-2">Role / Position</p>
                    <div className="flex gap-2 text-muted-foreground">
                      <Twitter className="w-4 h-4" />
                      <Linkedin className="w-4 h-4" />
                      <Github className="w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
            
            <section className="bg-primary/5 dark:bg-primary/10 p-8 md:p-16 rounded-2xl border relative overflow-hidden">
              <div className="max-w-3xl mx-auto text-center relative z-10">
                <h2 className="text-3xl font-bold tracking-tight mb-6">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Join thousands of users who are already automating their workflows with RunAI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="gap-2">
                    <Rocket className="w-4 h-4" />
                    Sign Up Free
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    View Pricing
                  </Button>
                </div>
              </div>
              <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent)]"></div>
            </section>
          </section>
        </div>
      )}
    </AppLayout>
  );
}