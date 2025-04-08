"use client";

import { useState, useEffect } from "react";
import { useS3Connection } from "@/hooks/api-hooks";
import { useSearchJob } from "@/hooks/search-job";
import { AuthForm } from "@/components/auth-form";
import { useAuth } from "@/hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AlertMessage } from "@/components/ui-elements";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [bucketName, setBucketName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [zipPassword, setZipPassword] = useState("GDSLink13!");
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [identifiers, setIdentifiers] = useState("");
  const [idFormat, setIdFormat] = useState("line");
  const [activeTab, setActiveTab] = useState("credentials");
  
  const { 
    jobId, 
    status, 
    progress, 
    results, 
    error, 
    startSearchJob, 
    getFormattedResults, 
    getResultsCSV 
  } = useSearchJob();
  
  const s3Connection = useS3Connection();
  const [downloadableZips, setDownloadableZips] = useState<{zipFile: string, s3Path: string}[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setIdentifiers(content);
    };
    reader.readAsText(file);
  };

  const handleSearch = async () => {
    // Validate inputs
    if (!awsAccessKey || !awsSecretKey || !bucketName) {
      alert("AWS credentials and bucket name are required");
      return;
    }

    if (!identifiers) {
      alert("Please provide identifiers");
      return;
    }

    try {
      // Save credentials if requested
      if (saveCredentials && typeof window !== 'undefined') {
        localStorage.setItem("awsAccessKey", awsAccessKey);
        localStorage.setItem("awsSecretKey", awsSecretKey);
        localStorage.setItem("awsRegion", awsRegion);
        localStorage.setItem("bucketName", bucketName);
        localStorage.setItem("prefix", prefix);
      }

      // Start search job
      await startSearchJob({
        credentials: {
          accessKey: awsAccessKey,
          secretKey: awsSecretKey,
          region: awsRegion
        },
        bucketName,
        prefix,
        zipPassword,
        identifiers,
        idFormat: idFormat as 'line' | 'csv'
      });

      // Switch to results tab
      setActiveTab("results");
    } catch (err) {
      console.error("Error starting search:", err);
    }
  };

  // Extract unique zip files from results for download
  useEffect(() => {
    if (results.length > 0) {
      const uniqueZips = new Map<string, {zipFile: string, s3Path: string}>();
      
      results.forEach(result => {
        result.occurrences.forEach(occurrence => {
          uniqueZips.set(occurrence.zipFile, {
            zipFile: occurrence.zipFile,
            s3Path: occurrence.s3Path
          });
        });
      });
      
      setDownloadableZips(Array.from(uniqueZips.values()));
    } else {
      setDownloadableZips([]);
    }
  }, [results]);

  // Download a zip file
  const handleDownloadZip = async (zipFile: string) => {
    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKey: awsAccessKey,
          secretKey: awsSecretKey,
          region: awsRegion,
          bucketName,
          objectKey: zipFile
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to download zip file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFile.split('/').pop() || zipFile;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading zip file:', error);
      alert('Failed to download zip file. Please try again.');
    }
  };

  // Load saved credentials on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAccessKey = localStorage.getItem("awsAccessKey");
      const savedSecretKey = localStorage.getItem("awsSecretKey");
      const savedRegion = localStorage.getItem("awsRegion");
      const savedBucketName = localStorage.getItem("bucketName");
      const savedPrefix = localStorage.getItem("prefix");

      if (savedAccessKey) setAwsAccessKey(savedAccessKey);
      if (savedSecretKey) setAwsSecretKey(savedSecretKey);
      if (savedRegion) setAwsRegion(savedRegion);
      if (savedBucketName) setBucketName(savedBucketName);
      if (savedPrefix) setPrefix(savedPrefix);
    }
  }, []);

  // If authentication is required, show login form
  if (!user.authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
        <h1 className="text-3xl font-bold mb-8">S3 File Search Application</h1>
        <AuthForm />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
      <h1 className="text-3xl font-bold mb-8">S3 File Search Application</h1>
      
      <div className="w-full max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="credentials">AWS Credentials</TabsTrigger>
            <TabsTrigger value="bucket">S3 Bucket</TabsTrigger>
            <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle>AWS Credentials</CardTitle>
                <CardDescription>
                  Enter your AWS credentials to connect to S3
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-key">AWS Access Key ID</Label>
                  <Input 
                    id="access-key" 
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="Enter your AWS Access Key ID" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret-key">AWS Secret Access Key</Label>
                  <Input 
                    id="secret-key" 
                    type={showPassword ? "text" : "password"}
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    placeholder="Enter your AWS Secret Access Key" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">AWS Region</Label>
                  <Input 
                    id="region" 
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    placeholder="us-east-1" 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-creds" 
                    checked={saveCredentials}
                    onCheckedChange={(checked) => setSaveCredentials(checked as boolean)}
                  />
                  <Label htmlFor="save-creds">Save credentials for future use</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bucket">
            <Card>
              <CardHeader>
                <CardTitle>S3 Bucket Configuration</CardTitle>
                <CardDescription>
                  Specify the S3 bucket to search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bucket-name">Bucket Name</Label>
                  <Input 
                    id="bucket-name" 
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="Enter your S3 bucket name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix (optional)</Label>
                  <Input 
                    id="prefix" 
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="Enter a prefix to limit the search scope" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip-password">Zip Password</Label>
                  <Input 
                    id="zip-password" 
                    type={showPassword ? "text" : "password"}
                    value={zipPassword}
                    onChange={(e) => setZipPassword(e.target.value)}
                    placeholder="Enter zip file password" 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-password" 
                    checked={showPassword}
                    onCheckedChange={(checked) => setShowPassword(checked as boolean)}
                  />
                  <Label htmlFor="show-password">Show password</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="identifiers">
            <Card>
              <CardHeader>
                <CardTitle>Identifiers List</CardTitle>
                <CardDescription>
                  Upload or enter the identifiers to search for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifiers-file">Upload Identifiers File</Label>
                  <Input 
                    id="identifiers-file" 
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="identifiers-text">Or Enter Identifiers Directly</Label>
                  <textarea 
                    id="identifiers-text"
                    className="w-full min-h-[200px] p-2 border rounded-md"
                    value={identifiers}
                    onChange={(e) => setIdentifiers(e.target.value)}
                    placeholder="Enter identifiers, one per line"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="format-line" 
                      name="id-format"
                      checked={idFormat === "line"}
                      onChange={() => setIdFormat("line")}
                    />
                    <Label htmlFor="format-line">One per line</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="format-csv" 
                      name="id-format"
                      checked={idFormat === "csv"}
                      onChange={() => setIdFormat("csv")}
                    />
                    <Label htmlFor="format-csv">CSV</Label>
                  </div>
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={status === 'processing'}
                  className="w-full"
                >
                  Start Search
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  View and download search results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <AlertMessage
                    type="error"
                    title="Search Error"
                    message={error}
                  />
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <Label>Status: {status}</Label>
                    <div className="text-sm">{progress}%</div>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
                
                <div className="flex space-x-4">
                  <Button 
                    onClick={handleSearch}
                    disabled={status === 'processing'}
                  >
                    {status === 'processing' ? 'Searching...' : 'Start Search'}
                  </Button>
                  <Button 
                    variant="outline"
                    disabled={results.length === 0}
                    onClick={() => {
                      const csv = getResultsCSV();
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "search_results.csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    Download Results CSV
                  </Button>
                </div>
                
                {/* Results display */}
                <div className="border rounded-md p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {status === 'processing' 
                        ? 'Searching... Please wait.' 
                        : 'No results yet. Start a search to see results here.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Found {results.length} unique identifiers</h3>
                      <ul className="space-y-4">
                        {results.map((result, index) => (
                          <li key={index} className="border-b pb-4">
                            <div className="font
(Content truncated due to size limit. Use line ranges to read in chunks)