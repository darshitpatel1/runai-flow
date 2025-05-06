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
              
              <TabsContent value="flows" className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3">
                    <div className="sticky top-6 space-y-6">
                      <div className="bg-primary/5 rounded-lg p-4 border">
                        <h3 className="font-medium mb-2">In this section</h3>
                        <ul className="space-y-1">
                          <li>
                            <a href="#flow-basics" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> Flow Basics
                            </a>
                          </li>
                          <li>
                            <a href="#nodes" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> Nodes
                            </a>
                          </li>
                          <li>
                            <a href="#variables" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> Variables
                            </a>
                          </li>
                          <li>
                            <a href="#execution" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> Flow Execution
                            </a>
                          </li>
                          <li>
                            <a href="#debugging" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> Debugging
                            </a>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="bg-primary/5 rounded-lg p-4 border">
                        <h3 className="font-medium mb-2">Related</h3>
                        <ul className="space-y-1">
                          <li>
                            <a href="#" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" /> Advanced Flow Patterns
                            </a>
                          </li>
                          <li>
                            <a href="#" className="text-muted-foreground hover:text-primary flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" /> Error Handling
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-2/3 space-y-8">
                    <section id="flow-basics" className="scroll-mt-16">
                      <h2 className="text-2xl font-bold tracking-tight mb-4">Flow Basics</h2>
                      <p className="text-muted-foreground mb-4">
                        Flows are the core of the RunAI platform. They allow you to create automated workflows by connecting nodes that represent actions or triggers.
                      </p>
                      <p className="text-muted-foreground mb-4">
                        Each flow consists of a collection of nodes connected by edges. The nodes represent the actions or steps in your workflow, while the edges define the order of execution.
                      </p>
                      <div className="rounded-lg overflow-hidden border mb-4">
                        <img 
                          src="https://placehold.co/800x400/e2e8f0/64748b?text=Flow+Builder+Diagram" 
                          alt="Flow Builder Diagram"
                          className="w-full"
                        />
                      </div>
                      <p className="text-muted-foreground">
                        To create a new flow, go to the <Link href="/flow-builder"><span className="text-primary">Flow Builder</span></Link> page and click the "New Flow" button.
                      </p>
                    </section>

                    <section id="nodes" className="scroll-mt-16">
                      <h2 className="text-2xl font-bold tracking-tight mb-4">Nodes</h2>
                      <p className="text-muted-foreground mb-4">
                        Nodes are the building blocks of your flows. Each node represents a specific action, such as making an API request, transforming data, or accessing a database.
                      </p>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="http-node">
                          <AccordionTrigger className="font-medium">HTTP Request Nodes</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-muted-foreground mb-4">
                              HTTP Request nodes allow you to make API calls to external services. You can configure the method (GET, POST, PUT, DELETE), URL, headers, and body of the request.
                            </p>
                            <p className="text-muted-foreground mb-4">
                              The response from the API call will be available to subsequent nodes in your flow. You can access this data using variable references in the format <code className="bg-muted px-1 rounded">{"{{nodeId.response.data}}"}</code>.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="js-node">
                          <AccordionTrigger className="font-medium">JavaScript Nodes</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-muted-foreground mb-4">
                              JavaScript nodes allow you to write custom code to transform, filter, or manipulate data. You can use standard JavaScript syntax and functions within these nodes.
                            </p>
                            <p className="text-muted-foreground mb-4">
                              The code in JavaScript nodes has access to data from previous nodes via the <code className="bg-muted px-1 rounded">inputs</code> object. The return value of your code will be available to subsequent nodes.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="table-node">
                          <AccordionTrigger className="font-medium">Table Nodes</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-muted-foreground mb-4">
                              Table nodes allow you to interact with data tables in your account. You can read, write, update, or delete data from tables using these nodes.
                            </p>
                            <p className="text-muted-foreground mb-4">
                              Table nodes support parameterized queries, enabling you to use dynamic values from previous nodes in your table operations.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="loop-node">
                          <AccordionTrigger className="font-medium">Loop Nodes</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-muted-foreground mb-4">
                              Loop nodes allow you to iterate over arrays or repeat actions a specified number of times. There are two types of loop nodes:
                            </p>
                            <ul className="list-disc list-inside mb-4 text-muted-foreground space-y-2">
                              <li><strong>ForEach Loop</strong>: Iterates over each item in an array.</li>
                              <li><strong>While Loop</strong>: Repeats actions as long as a condition is true.</li>
                            </ul>
                            <p className="text-muted-foreground">
                              Inside a loop, you can access the current iteration using <code className="bg-muted px-1 rounded">{"{{loop.index}}"}</code> and the current item using <code className="bg-muted px-1 rounded">{"{{loop.item}}"}</code>.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </section>

                    <section id="variables" className="scroll-mt-16">
                      <h2 className="text-2xl font-bold tracking-tight mb-4">Variables</h2>
                      <p className="text-muted-foreground mb-4">
                        Variables allow you to use data from one node in another node. This enables you to create dynamic workflows that adapt based on inputs or results from previous steps.
                      </p>
                      
                      <div className="bg-muted/50 p-4 rounded-lg border mb-6">
                        <h3 className="font-medium mb-2">Variable Syntax</h3>
                        <p className="text-muted-foreground mb-4">
                          Variables are referenced using double curly braces: <code className="bg-muted px-1 rounded">{"{{nodeId.path.to.data}}"}</code>
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                          <li>
                            <strong>HTTP Nodes</strong>: <code className="bg-muted px-1 rounded">{"{{httpNode.response.data.users}}"}</code>
                          </li>
                          <li>
                            <strong>JavaScript Nodes</strong>: <code className="bg-muted px-1 rounded">{"{{jsNode.result}}"}</code>
                          </li>
                          <li>
                            <strong>Table Nodes</strong>: <code className="bg-muted px-1 rounded">{"{{tableNode.rows}}"}</code>
                          </li>
                        </ul>
                      </div>
                      
                      <p className="text-muted-foreground">
                        To use variables in your flow, click the variable selector button <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded">{"{{}}"}</span> when configuring node parameters.
                      </p>
                    </section>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="connectors" className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-2/3">
                      <h2 className="text-2xl font-bold tracking-tight mb-4">What are Connectors?</h2>
                      <p className="text-muted-foreground mb-6">
                        Connectors are pre-configured integrations that allow your flows to connect to external services and APIs. 
                        They handle authentication, formatting, and other details needed to communicate with third-party platforms.
                      </p>
                      
                      <h3 className="text-xl font-semibold mb-3">Key Benefits of Connectors</h3>
                      <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                        <li>Simplified authentication with OAuth, API keys, and other methods</li>
                        <li>Pre-built templates for common API operations</li>
                        <li>Consistent interface across different services</li>
                        <li>Automatic handling of rate limits and retries</li>
                        <li>Detailed logs and error reporting</li>
                      </ul>
                    </div>
                    
                    <div className="md:w-1/3 bg-primary/5 p-4 rounded-lg border">
                      <h3 className="font-medium mb-3">Quick Links</h3>
                      <ul className="space-y-2">
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Creating a New Connector</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Authentication Methods</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Using Connector Variables</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Connector Security Best Practices</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h2 className="text-2xl font-bold tracking-tight mb-6">Popular Connectors</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#2E77BC]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#2E77BC] font-bold text-xl">D</div>
                        </div>
                        <div>
                          <h3 className="font-medium">Dropbox</h3>
                          <p className="text-muted-foreground text-sm">Cloud storage & file sharing</p>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#1A73E8]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#1A73E8] font-bold text-xl">G</div>
                        </div>
                        <div>
                          <h3 className="font-medium">Google Sheets</h3>
                          <p className="text-muted-foreground text-sm">Spreadsheet & data management</p>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#03363D]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#03363D] font-bold text-xl">Z</div>
                        </div>
                        <div>
                          <h3 className="font-medium">Zendesk</h3>
                          <p className="text-muted-foreground text-sm">Customer support platform</p>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#036AA7]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#036AA7] font-bold text-xl">T</div>
                        </div>
                        <div>
                          <h3 className="font-medium">Trello</h3>
                          <p className="text-muted-foreground text-sm">Project management tool</p>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#7A69B3]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#7A69B3] font-bold text-xl">H</div>
                        </div>
                        <div>
                          <h3 className="font-medium">HubSpot</h3>
                          <p className="text-muted-foreground text-sm">CRM & marketing platform</p>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg flex items-center gap-4">
                        <div className="bg-[#E01E5A]/10 p-2 rounded-md">
                          <div className="w-10 h-10 flex items-center justify-center text-[#E01E5A] font-bold text-xl">S</div>
                        </div>
                        <div>
                          <h3 className="font-medium">Slack</h3>
                          <p className="text-muted-foreground text-sm">Team communication tool</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Setting Up Authentication</h2>
                    <p className="text-muted-foreground mb-6">
                      Most connectors require authentication to access external services. RunAI supports several authentication methods:
                    </p>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="api-key">
                        <AccordionTrigger className="font-medium">API Key Authentication</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            API Key authentication involves using a unique key or token provided by the service. Here's how to set it up:
                          </p>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Obtain an API key from the service provider's developer portal</li>
                            <li>Create a new connector in RunAI</li>
                            <li>Select "API Key" as the authentication type</li>
                            <li>Enter your API key in the designated field</li>
                            <li>Specify the header name (usually "Authorization" or "X-API-Key")</li>
                          </ol>
                          <p className="text-muted-foreground">
                            Your API key will be securely stored and automatically included in all requests made through the connector.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="oauth">
                        <AccordionTrigger className="font-medium">OAuth 2.0 Authentication</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            OAuth 2.0 is a secure authentication method that doesn't require storing user credentials. To set up OAuth:
                          </p>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Register an application in the service provider's developer portal</li>
                            <li>Get the Client ID and Client Secret</li>
                            <li>Set up the redirect URI to point to your RunAI instance</li>
                            <li>Create a new connector in RunAI</li>
                            <li>Select "OAuth 2.0" as the authentication type</li>
                            <li>Enter the Client ID, Client Secret, and other required fields</li>
                            <li>Click "Authorize" to complete the OAuth flow</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="basic">
                        <AccordionTrigger className="font-medium">Basic Authentication</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            Basic authentication uses a username and password encoded in base64 format. To set up Basic auth:
                          </p>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Create a new connector in RunAI</li>
                            <li>Select "Basic Auth" as the authentication type</li>
                            <li>Enter the username and password</li>
                          </ol>
                          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-md text-yellow-800 dark:text-yellow-200 text-sm mb-4">
                            <strong>Note:</strong> Basic authentication is less secure than other methods. Use it only if the service doesn't support more secure options.
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="tables" className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-2/3">
                      <h2 className="text-2xl font-bold tracking-tight mb-4">Working with Tables</h2>
                      <p className="text-muted-foreground mb-6">
                        Tables allow you to store, manage, and access structured data within your RunAI account. 
                        They are perfect for storing configuration data, user information, transaction records, 
                        or any other data your flows need to access.
                      </p>
                      
                      <h3 className="text-xl font-semibold mb-3">Key Features</h3>
                      <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
                        <li>Excel-like direct editing interface</li>
                        <li>Support for multiple column types (text, number, boolean, date, select)</li>
                        <li>Data filtering and sorting</li>
                        <li>CSV import and export</li>
                        <li>Full integration with flow nodes</li>
                      </ul>
                    </div>
                    
                    <div className="md:w-1/3 bg-primary/5 p-4 rounded-lg border">
                      <h3 className="font-medium mb-3">Quick Links</h3>
                      <ul className="space-y-2">
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Creating a New Table</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Column Types Reference</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Data Import/Export Guide</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                        <li>
                          <Button variant="link" className="p-0 h-auto text-left flex items-center gap-2">
                            <span>Using Tables in Flows</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Creating and Managing Tables</h2>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="create-table">
                        <AccordionTrigger className="font-medium">Creating a Table</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            To create a new table:
                          </p>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Navigate to the "Tables" section in the sidebar</li>
                            <li>Click the "New Table" button</li>
                            <li>Enter a name and optional description for your table</li>
                            <li>Define your columns (name, type, and options)</li>
                            <li>Click "Create Table" to save</li>
                          </ol>
                          <p className="text-muted-foreground mb-4">
                            Each column must have a unique name and a specified data type. The available types are:
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li><strong>Text</strong>: For storing strings, names, descriptions, etc.</li>
                            <li><strong>Number</strong>: For storing numeric values (integers or decimals)</li>
                            <li><strong>Boolean</strong>: For storing true/false values</li>
                            <li><strong>Date</strong>: For storing dates and timestamps</li>
                            <li><strong>Select</strong>: For storing values from a predefined list of options</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="edit-table">
                        <AccordionTrigger className="font-medium">Editing Table Structure</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            To modify a table's structure:
                          </p>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Open the table by clicking on it in the Tables list</li>
                            <li>Click the "Edit Table" button in the top right</li>
                            <li>Make your changes to the table structure</li>
                            <li>Click "Save Changes" to apply your modifications</li>
                          </ol>
                          <p className="text-muted-foreground">
                            You can add new columns, remove existing ones, or change column properties. Be careful when modifying columns that already contain data, as changes might affect existing values.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="manage-data">
                        <AccordionTrigger className="font-medium">Managing Table Data</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            RunAI provides an Excel-like interface for managing data in your tables:
                          </p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Click directly on a cell to edit its value</li>
                            <li>Press Tab to move to the next cell</li>
                            <li>Press Enter to save your changes</li>
                            <li>Use the "Add Row" button to add new records</li>
                            <li>Click the delete icon to remove rows</li>
                          </ul>
                          <p className="text-muted-foreground">
                            You can also filter and sort data using the column headers. Click on a column header to sort by that column, or use the filter icon to filter the data.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="import-export">
                        <AccordionTrigger className="font-medium">Importing and Exporting Data</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            RunAI supports importing and exporting table data in CSV format:
                          </p>
                          <h4 className="font-medium mt-2 mb-2">Importing CSV</h4>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                            <li>Open the table</li>
                            <li>Click the "Import CSV" button</li>
                            <li>Select your CSV file</li>
                            <li>Map the CSV columns to your table columns</li>
                            <li>Click "Import" to load the data</li>
                          </ol>
                          <h4 className="font-medium mt-2 mb-2">Exporting CSV</h4>
                          <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                            <li>Open the table</li>
                            <li>Click the "Export CSV" button</li>
                            <li>The CSV file will be downloaded to your computer</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Using Tables in Flows</h2>
                    <p className="text-muted-foreground mb-6">
                      Tables can be integrated into your flows using Table nodes, which allow you to read, write, update, and delete data.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border rounded-lg p-5">
                        <h3 className="text-lg font-medium mb-3">Reading Table Data</h3>
                        <p className="text-muted-foreground mb-4">
                          To read data from a table in your flow:
                        </p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                          <li>Add a "Table Query" node to your flow</li>
                          <li>Select the table you want to read from</li>
                          <li>Configure any filtering or sorting options</li>
                          <li>The node output will contain the retrieved rows</li>
                        </ol>
                      </div>
                      
                      <div className="border rounded-lg p-5">
                        <h3 className="text-lg font-medium mb-3">Writing Table Data</h3>
                        <p className="text-muted-foreground mb-4">
                          To write data to a table in your flow:
                        </p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                          <li>Add a "Table Insert" node to your flow</li>
                          <li>Select the target table</li>
                          <li>Map input data to table columns</li>
                          <li>The node will insert the data and return the new row</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="api" className="space-y-8">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold tracking-tight mb-4">API Reference</h2>
                  <p className="text-muted-foreground mb-6">
                    RunAI provides a comprehensive REST API that allows you to interact with all aspects of the platform programmatically.
                    You can create and manage flows, connectors, tables, and executions using the API.
                  </p>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-4 border-b">
                      <h3 className="text-lg font-medium">API Endpoints</h3>
                    </div>
                    <div className="divide-y">
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">GET</span>
                          <code className="text-muted-foreground">/api/flows</code>
                        </div>
                        <p className="text-sm text-muted-foreground">List all flows in your account</p>
                      </div>
                      
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">GET</span>
                          <code className="text-muted-foreground">/api/flows/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Get details of a specific flow</p>
                      </div>
                      
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">POST</span>
                          <code className="text-muted-foreground">/api/flows</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Create a new flow</p>
                      </div>
                      
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">PUT</span>
                          <code className="text-muted-foreground">/api/flows/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Update an existing flow</p>
                      </div>
                      
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">DELETE</span>
                          <code className="text-muted-foreground">/api/flows/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Delete a flow</p>
                      </div>
                      
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">POST</span>
                          <code className="text-muted-foreground">/api/flows/:id/execute</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Execute a flow</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Authentication</h2>
                    <p className="text-muted-foreground mb-6">
                      All API requests must include your API key in the Authorization header:
                    </p>
                    
                    <div className="bg-muted p-4 rounded-lg mb-6 overflow-x-auto">
                      <pre className="text-sm">
                        <code>Authorization: Bearer YOUR_API_KEY</code>
                      </pre>
                    </div>
                    
                    <p className="text-muted-foreground">
                      You can generate API keys in your account settings. Keep your API keys secure and never share them publicly.
                    </p>
                  </div>
                  
                  <div className="bg-primary/5 p-6 rounded-lg border">
                    <h3 className="text-xl font-bold mb-4">API Documentation</h3>
                    <p className="mb-4">For complete API documentation, including request and response formats for all endpoints, please visit our API reference site.</p>
                    <Button>View Full API Documentation</Button>
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