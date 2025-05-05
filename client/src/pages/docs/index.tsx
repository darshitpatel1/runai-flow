import { useState, useEffect } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll position for animation effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter documentation sections based on search query
  const filterContent = (content: string) => {
    if (!searchQuery) return true;
    return content.toLowerCase().includes(searchQuery.toLowerCase());
  };
  
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
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        </div>
        
        <div className="container relative mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center z-10">
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
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-16 mb-8"
          >
            <a href="#docs-content" className="inline-flex items-center justify-center transition-transform hover:translate-y-1">
              <ArrowDownCircle className="w-10 h-10 text-primary/70 animate-bounce" />
            </a>
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
      
      {/* Documentation Content */}
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
              <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3">
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
                            After execution, the node will provide the response data, which can be used by downstream nodes in your flow.
                          </p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="transform-node">
                        <AccordionTrigger className="font-medium">Transform Nodes</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            Transform nodes let you modify data using JavaScript code. This is useful for filtering, formatting, or restructuring data from previous nodes.
                          </p>
                          <p className="text-muted-foreground mb-4">
                            Example: Converting temperatures from Celsius to Fahrenheit, formatting dates, or extracting specific fields from JSON data.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="loop-node">
                        <AccordionTrigger className="font-medium">Loop Nodes</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            Loop nodes enable iteration over arrays of data. This is useful when you need to process multiple items, such as records from a database or items in an API response.
                          </p>
                          <p className="text-muted-foreground mb-4">
                            Inside a loop, you can access the current item using the <code>loop.item</code> variable, and the index with <code>loop.index</code>.
                          </p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="condition-node">
                        <AccordionTrigger className="font-medium">Condition Nodes</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground mb-4">
                            Condition nodes allow you to create branching logic in your flows based on specific criteria. The flow will continue along different paths depending on whether the condition is true or false.
                          </p>
                          <p className="text-muted-foreground mb-4">
                            Example: Sending different notifications based on a temperature threshold, or handling API responses differently depending on status codes.
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </section>

                  <section id="variables" className="scroll-mt-16">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Using Variables</h2>
                    <p className="text-muted-foreground mb-4">
                      Variables allow you to pass data between nodes in your flow. Each node generates output variables that can be used by downstream nodes.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      To reference a variable from a previous node, use the following syntax: <code>{'{{nodeId.result.path}}'}</code>
                    </p>
                    <div className="bg-primary/5 p-4 rounded-lg border mb-4">
                      <h4 className="font-medium mb-2">Example</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        If you have an HTTP node with ID "fetch_user" that returns JSON with a "name" field, you can access it in a subsequent node with:
                      </p>
                      <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                        {'{{fetch_user.result.name}}'}
                      </pre>
                    </div>
                    <p className="text-muted-foreground">
                      You can use the Variable Selector in node configuration panels to browse and select available variables from previous nodes.
                    </p>
                  </section>

                  <section id="execution" className="scroll-mt-16">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Flow Execution</h2>
                    <p className="text-muted-foreground mb-4">
                      When you run a flow, nodes are executed in the order defined by the connections between them. Each node processes its inputs, performs its action, and provides outputs to downstream nodes.
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Flows can be triggered manually from the Flow Builder, or automatically based on schedules or external events (depending on your subscription).
                    </p>
                  </section>

                  <section id="debugging" className="scroll-mt-16">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Debugging Flows</h2>
                    <p className="text-muted-foreground mb-4">
                      RunAI provides several tools to help you debug your flows:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                      <li>The Console Output panel shows logs and execution results in real-time</li>
                      <li>Node test functionality allows you to test individual nodes without running the entire flow</li>
                      <li>Execution history tracks past runs with detailed logs for each node</li>
                    </ul>
                    <p className="text-muted-foreground">
                      Use these tools to identify and fix issues in your flows, ensuring they run reliably in production.
                    </p>
                  </section>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="connectors" className="space-y-8">
              <section className="max-w-4xl">
                <h2 className="text-2xl font-bold tracking-tight mb-4">Connectors</h2>
                <p className="text-muted-foreground mb-4">
                  Connectors are pre-configured integrations that allow your flows to interact with external services and APIs. They simplify the process of authentication and data exchange with third-party platforms.
                </p>

                <div className="space-y-6 mt-6">
                  <h3 className="text-xl font-semibold">Creating a Connector</h3>
                  <p className="text-muted-foreground mb-4">
                    To create a new connector, follow these steps:
                  </p>
                  <ol className="list-decimal pl-6 space-y-3 text-muted-foreground mb-4">
                    <li>Navigate to the <Link href="/connectors"><span className="text-primary">Connectors</span></Link> page</li>
                    <li>Click the "Add Connector" button</li>
                    <li>Select the connector type from the available options</li>
                    <li>Enter the required authentication information (API keys, credentials, etc.)</li>
                    <li>Click "Save" to create the connector</li>
                  </ol>

                  <div className="rounded-lg overflow-hidden border mb-6">
                    <img 
                      src="https://placehold.co/800x400/e2e8f0/64748b?text=Connector+Configuration" 
                      alt="Connector Configuration"
                      className="w-full"
                    />
                  </div>

                  <h3 className="text-xl font-semibold">Authentication Types</h3>
                  <p className="text-muted-foreground mb-4">
                    RunAI supports various authentication methods for connectors:
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>API Key</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Simple authentication using a secret key provided by the API service. The key is included in request headers or query parameters.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Auth</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Username and password authentication encoded in the request headers.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>OAuth 2.0</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Token-based authentication for secure, delegated access to resources without sharing credentials.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Custom Headers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For APIs requiring specific header configurations beyond standard authentication methods.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <h3 className="text-xl font-semibold">Using Connectors in Flows</h3>
                  <p className="text-muted-foreground mb-4">
                    Once created, connectors can be used in HTTP Request nodes within your flows:
                  </p>
                  <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
                    <li>Add an HTTP Request node to your flow</li>
                    <li>In the node configuration, select the connector from the dropdown menu</li>
                    <li>Configure the request details (endpoint path, method, payload, etc.)</li>
                    <li>The connector will automatically handle authentication for the request</li>
                  </ol>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="tables" className="space-y-8">
              <section className="max-w-4xl">
                <h2 className="text-2xl font-bold tracking-tight mb-4">Tables</h2>
                <p className="text-muted-foreground mb-4">
                  Tables provide a way to store and manage data within RunAI. They can be used to store configuration settings, intermediate results, or any structured data needed by your flows.
                </p>

                <div className="space-y-6 mt-6">
                  <h3 className="text-xl font-semibold">Creating and Managing Tables</h3>
                  <p className="text-muted-foreground mb-4">
                    To create a new table, navigate to the <Link href="/tables"><span className="text-primary">Tables</span></Link> page and click "Create Table". You'll need to define:
                  </p>
                  
                  <ol className="list-decimal pl-6 space-y-3 text-muted-foreground mb-6">
                    <li>Table name and description</li>
                    <li>Columns with names, data types, and constraints</li>
                  </ol>

                  <h3 className="text-xl font-semibold">Supported Column Types</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Text</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For storing strings, names, descriptions, and other text-based data.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Number</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For storing numeric values, both integers and decimals.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Boolean</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For true/false values, represented as checkboxes in the UI.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Date</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For storing dates and timestamps, with calendar picker in the UI.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Select</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          For predefined options selected from a dropdown menu.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <h3 className="text-xl font-semibold">Inline Editing</h3>
                  <p className="text-muted-foreground mb-4">
                    RunAI tables feature Excel-like inline editing capabilities. To edit cell values:
                  </p>
                  <ol className="list-decimal pl-6 space-y-3 text-muted-foreground mb-6">
                    <li>Click on a cell to start editing</li>
                    <li>Press Enter to save changes</li>
                    <li>Press Escape to cancel editing</li>
                  </ol>

                  <h3 className="text-xl font-semibold">Filtering and Searching</h3>
                  <p className="text-muted-foreground mb-4">
                    You can filter table data by:
                  </p>
                  <ul className="list-disc pl-6 space-y-3 text-muted-foreground mb-6">
                    <li>Using the search bar to filter across all columns</li>
                    <li>Clicking on column names to filter by specific column values</li>
                    <li>Combining multiple column filters for more precise results</li>
                  </ul>

                  <h3 className="text-xl font-semibold">Working with Tables in Flows</h3>
                  <p className="text-muted-foreground mb-4">
                    Tables can be integrated with your flows using Table nodes, which allow you to:
                  </p>
                  <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                    <li>Read data from tables to use in your flow</li>
                    <li>Write results back to tables for storage or later use</li>
                    <li>Update existing records based on conditions</li>
                    <li>Delete records that are no longer needed</li>
                  </ul>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="api" className="space-y-8">
              <section className="max-w-4xl">
                <h2 className="text-2xl font-bold tracking-tight mb-4">API Reference</h2>
                <p className="text-muted-foreground mb-4">
                  RunAI provides a RESTful API that allows you to interact with the platform programmatically. This reference documents the available endpoints and their usage.
                </p>

                <div className="space-y-6 mt-6">
                  <h3 className="text-xl font-semibold">Authentication</h3>
                  <p className="text-muted-foreground mb-4">
                    All API requests must be authenticated using an API key. You can generate API keys in the Settings page.
                  </p>
                  <div className="bg-primary/5 p-4 rounded-lg border mb-6">
                    <h4 className="font-medium mb-2">Example Request</h4>
                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`# Using cURL
curl -X GET "https://api.runai.com/v1/flows" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                    </pre>
                  </div>

                  <h3 className="text-xl font-semibold">Endpoints</h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="flows-api">
                      <AccordionTrigger className="font-medium">Flows API</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-1">List Flows</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/flows</p>
                            <p className="text-sm text-muted-foreground">Returns a list of all flows in your account.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Flow</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/flows/{'{flowId}'}</p>
                            <p className="text-sm text-muted-foreground">Returns details of a specific flow.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Execute Flow</h4>
                            <p className="text-xs text-muted-foreground mb-1">POST /v1/flows/{'{flowId}'}/execute</p>
                            <p className="text-sm text-muted-foreground">Triggers execution of a specific flow.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="connectors-api">
                      <AccordionTrigger className="font-medium">Connectors API</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-1">List Connectors</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/connectors</p>
                            <p className="text-sm text-muted-foreground">Returns a list of all connectors in your account.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Connector</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/connectors/{'{connectorId}'}</p>
                            <p className="text-sm text-muted-foreground">Returns details of a specific connector.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="tables-api">
                      <AccordionTrigger className="font-medium">Tables API</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-1">List Tables</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/tables</p>
                            <p className="text-sm text-muted-foreground">Returns a list of all tables in your account.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Table</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/tables/{'{tableId}'}</p>
                            <p className="text-sm text-muted-foreground">Returns details of a specific table.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Table Rows</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/tables/{'{tableId}'}/rows</p>
                            <p className="text-sm text-muted-foreground">Returns rows from a specific table.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="executions-api">
                      <AccordionTrigger className="font-medium">Executions API</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-1">List Executions</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/executions</p>
                            <p className="text-sm text-muted-foreground">Returns a list of all flow executions in your account.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Execution</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/executions/{'{executionId}'}</p>
                            <p className="text-sm text-muted-foreground">Returns details of a specific execution.</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-1">Get Execution Logs</h4>
                            <p className="text-xs text-muted-foreground mb-1">GET /v1/executions/{'{executionId}'}/logs</p>
                            <p className="text-sm text-muted-foreground">Returns logs from a specific execution.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="bg-primary/5 p-6 rounded-lg border mt-8">
                  <h3 className="text-xl font-bold mb-4">Rate Limits</h3>
                  <p className="mb-4">
                    The API is subject to rate limiting to ensure fair usage and service stability. Current limits are:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>60 requests per minute for standard accounts</li>
                    <li>300 requests per minute for premium accounts</li>
                    <li>Execution endpoints are limited to 10 requests per minute</li>
                  </ul>
                </div>
              </section>
            </TabsContent>
            
            <TabsContent value="about" className="space-y-12">
              <section className="max-w-4xl">
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
              </section>
              
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}