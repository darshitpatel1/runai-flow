import { useState, useEffect } from "react";
import { 
  updateProfile, 
  updateEmail, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  User,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Shield, User as UserIcon, Palette, Bell, Settings as SettingsIcon, Key, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }).optional(),
  photoURL: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

const emailFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  currentPassword: z.string().min(6, {
    message: "Current password is required to change email.",
  }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Current password is required.",
  }),
  newPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Customize this schema based on your app's features
const notificationsFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  flowExecutionAlerts: z.boolean().default(true),
  errorAlerts: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

// Customize app settings based on available features
const appSettingsFormSchema = z.object({
  hideWelcomeScreen: z.boolean().default(false),
  automaticFlowLayout: z.boolean().default(true),
  showTestData: z.boolean().default(true),
  autoSaveFlows: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type EmailFormValues = z.infer<typeof emailFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;
type AppSettingsFormValues = z.infer<typeof appSettingsFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Initialize forms
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      photoURL: user?.photoURL || "",
    },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: user?.email || "",
      currentPassword: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailNotifications: true,
      flowExecutionAlerts: true,
      errorAlerts: true,
      marketingEmails: false,
    },
  });

  const appSettingsForm = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsFormSchema),
    defaultValues: {
      hideWelcomeScreen: false,
      automaticFlowLayout: true,
      showTestData: true,
      autoSaveFlows: true,
    },
  });

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;
      
      try {
        const settingsDoc = await getDoc(doc(db, "users", user.uid, "settings", "preferences"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setUserSettings(data);
          
          // Update form values
          if (data.notifications) {
            notificationsForm.reset(data.notifications);
          }
          
          if (data.appSettings) {
            appSettingsForm.reset(data.appSettings);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setSettingsLoading(false);
      }
    };
    
    loadUserSettings();
  }, [user]);

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      });
      
      emailForm.reset({
        email: user.email || "",
        currentPassword: "",
      });
    }
  }, [user]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
      });
      
      // Force refresh user data
      await user.reload();
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onEmailSubmit = async (data: EmailFormValues) => {
    if (!user || !user.email) return;
    
    setLoading(true);
    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update email
      await updateEmail(user, data.email);
      
      // Send verification email
      await sendEmailVerification(user);
      
      toast({
        title: "Email updated",
        description: "Your email has been updated. Please verify your new email address.",
      });
      
      // Reset form
      emailForm.reset({
        email: data.email,
        currentPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user || !user.email) return;
    
    setLoading(true);
    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, data.newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      
      // Reset form
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onNotificationsSubmit = async (data: NotificationsFormValues) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Save to Firestore
      await setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        notifications: data,
        // Keep any existing app settings
        appSettings: userSettings?.appSettings || appSettingsForm.getValues(),
      }, { merge: true });
      
      toast({
        title: "Notification preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onAppSettingsSubmit = async (data: AppSettingsFormValues) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Save to Firestore
      await setDoc(doc(db, "users", user.uid, "settings", "preferences"), {
        // Keep any existing notification settings
        notifications: userSettings?.notifications || notificationsForm.getValues(),
        appSettings: data,
      }, { merge: true });
      
      toast({
        title: "App settings saved",
        description: "Your application settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) return;
    
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification email sent",
        description: "Please check your inbox and follow the instructions to verify your email.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending verification email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="border-b-0 flex flex-wrap gap-1">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="app" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span>App Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Section */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is your public display name.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="photoURL"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Picture URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/avatar.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter a URL to your profile image.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-amber-800 dark:text-amber-400">Email Address</span>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mb-1">
                        {user?.email}
                        {user?.emailVerified ? (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                            Verified
                          </span>
                        ) : (
                          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs rounded-full">
                            Not Verified
                          </span>
                        )}
                      </p>
                      {!user?.emailVerified && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={sendVerificationEmail}
                          className="mt-2"
                        >
                          Send Verification Email
                        </Button>
                      )}
                    </div>
                    
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Section */}
          <TabsContent value="security">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>
                    Update your email address. You'll need to verify the new email.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              This will be used for account recovery and notifications.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={emailForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your current password" {...field} />
                            </FormControl>
                            <FormDescription>
                              For security reasons, please enter your current password.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Update Email"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your current password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="New password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Use at least 6 characters with a mix of letters, numbers and symbols.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>
                    These actions cannot be undone. Be careful!
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appearance Section */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Theme</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div 
                        className={`border rounded-md p-4 cursor-pointer flex flex-col items-center ${
                          theme === 'light' ? 'border-primary bg-primary/10' : 'bg-background'
                        }`}
                        onClick={() => setTheme('light')}
                      >
                        <div className="w-full h-24 rounded-md border mb-4 bg-white"></div>
                        <span className="font-medium">Light</span>
                      </div>
                      
                      <div 
                        className={`border rounded-md p-4 cursor-pointer flex flex-col items-center ${
                          theme === 'dark' ? 'border-primary bg-primary/10' : 'bg-background'
                        }`}
                        onClick={() => setTheme('dark')}
                      >
                        <div className="w-full h-24 rounded-md border mb-4 bg-slate-900"></div>
                        <span className="font-medium">Dark</span>
                      </div>
                      
                      {/* Can add more themes as needed */}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Layout Density</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="compact-mode" />
                        <Label htmlFor="compact-mode">Compact Mode</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uses tighter spacing for controls and containers.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Section */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control what notifications you receive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationsForm}>
                  <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-4">
                    <FormField
                      control={notificationsForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications via email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationsForm.control}
                      name="flowExecutionAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Flow Execution Alerts</FormLabel>
                            <FormDescription>
                              Get notified when your flows complete execution
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationsForm.control}
                      name="errorAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Error Alerts</FormLabel>
                            <FormDescription>
                              Get notified when your flows encounter errors
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationsForm.control}
                      name="marketingEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Marketing Emails</FormLabel>
                            <FormDescription>
                              Receive product updates and marketing emails
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Preferences"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Settings Section */}
          <TabsContent value="app">
            <Card>
              <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>
                  Configure how RunAI works for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...appSettingsForm}>
                  <form onSubmit={appSettingsForm.handleSubmit(onAppSettingsSubmit)} className="space-y-4">
                    <FormField
                      control={appSettingsForm.control}
                      name="hideWelcomeScreen"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Hide Welcome Screen</FormLabel>
                            <FormDescription>
                              Skip the welcome screen on startup
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="automaticFlowLayout"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Automatic Flow Layout</FormLabel>
                            <FormDescription>
                              Automatically arrange nodes in flows for better readability
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="showTestData"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Show Test Data</FormLabel>
                            <FormDescription>
                              Show node test data in the flow editor
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="autoSaveFlows"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Save Flows</FormLabel>
                            <FormDescription>
                              Automatically save flows as you make changes
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Settings"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}