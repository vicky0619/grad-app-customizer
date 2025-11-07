import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentViewerProps {
  originalTemplate: string;
  customizedDocument: string;
  changes: Array<{
    type: string;
    original: string;
    modified: string;
    reason: string;
  }>;
}

export function DocumentViewer({ originalTemplate, customizedDocument, changes }: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "customized">("side-by-side");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={viewMode === "side-by-side" ? "default" : "outline"}
          onClick={() => setViewMode("side-by-side")}
        >
          並排預覽
        </Button>
        <Button
          variant={viewMode === "customized" ? "default" : "outline"}
          onClick={() => setViewMode("customized")}
        >
          僅顯示客製化版本
        </Button>
      </div>

      {viewMode === "side-by-side" ? (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 text-gray-600">原始範本</h3>
            <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
              {originalTemplate}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2 text-blue-600">客製化版本</h3>
            <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
              {customizedDocument}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-blue-600">客製化版本</h3>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
            {customizedDocument}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-semibold mb-4">更動記錄</h3>
        <div className="space-y-3">
          {changes.map((change, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {change.type}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium text-red-600">原始:</span>
                  <span className="ml-2 text-gray-700">{change.original}</span>
                </div>
                <div>
                  <span className="font-medium text-green-600">修改:</span>
                  <span className="ml-2 text-gray-700">{change.modified}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">原因:</span>
                  <span className="ml-2 text-gray-600 italic">{change.reason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
