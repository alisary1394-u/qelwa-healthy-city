import React from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import T from "@/components/T";

export default function YesNoQuestion({ question, value, onChange, bgColor = "bg-blue-50" }) {
  return (
    <div className={cn("p-4 rounded-lg", bgColor)}>
      <Label className="block mb-3 font-medium">{question}</Label>
      <div className="flex gap-3">
        <Button
          type="button"
          variant={value === true ? "default" : "outline"}
          onClick={() => onChange(true)}
          className={cn(
            "flex-1",
            value === true && "bg-green-600 hover:bg-green-700"
          )}
        >
          <T>نعم</T>
        </Button>
        <Button
          type="button"
          variant={value === false ? "default" : "outline"}
          onClick={() => onChange(false)}
          className={cn(
            "flex-1",
            value === false && "bg-destructive hover:bg-destructive/90"
          )}
        >
          <T>لا</T>
        </Button>
      </div>
    </div>
  );
}