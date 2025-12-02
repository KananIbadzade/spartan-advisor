import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Send
} from 'lucide-react';
import { ConflictIndicator, Course, useConflictDetection } from '@/components/ConflictDetector';
import { Input } from '@/components/ui/input';

export interface CourseCartItem extends Course {
  addedAt: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export const useCourseCartManager = () => {
  const [cartItems, setCartItems] = React.useState<CourseCartItem[]>([]);
  const addCourse = (course: Course, priority: 'high' | 'medium' | 'low' = 'medium', notes?: string) => {
    setCartItems(prev => {
      if (prev.find(c => c.id === course.id && c.term === course.term && c.year === course.year)) return prev;
      return [...prev, { ...course, addedAt: new Date().toISOString(), priority, notes }];
    });
  };
  const removeCourse = (courseId: string) => {
    setCartItems(prev => prev.filter(c => c.id !== courseId));
  };
  const clearCart = () => setCartItems([]);
  const updateCoursePriority = (courseId: string, priority: 'high' | 'medium' | 'low') =>
    setCartItems(prev => prev.map(c => c.id === courseId ? { ...c, priority } : c));
  // New: update notes for a cart item
  const updateCourseNotes = (courseId: string, notes: string) =>
    setCartItems(prev => prev.map(c => c.id === courseId ? { ...c, notes } : c));

  return { cartItems, addCourse, removeCourse, clearCart, updateCoursePriority, updateCourseNotes };
};

interface CourseCartProps {
  layoutMode?: 'overlay' | 'split'; // NEW
  widthPx?: number;                 // NEW (only for split mode)
  isOpen: boolean;
  onToggle: () => void;
  onFinalizePlan: (courses: CourseCartItem[], submitToAdvisor?: boolean) => Promise<void>;
  cartItems: CourseCartItem[];
  addCourse: (course: Course, priority?: 'high' | 'medium' | 'low', notes?: string) => void;
  removeCourse: (courseId: string) => void;
  clearCart: () => void;
  updateCoursePriority: (courseId: string, priority: 'high' | 'medium' | 'low') => void;
  updateCourseNotes: (courseId: string, notes: string) => void; // NEW
  maxCourses?: number;
  hideFab?: boolean;
}

export const CourseCart: React.FC<CourseCartProps> = ({
  layoutMode = 'overlay',
  widthPx,
  isOpen,
  onToggle,
  onFinalizePlan,
  cartItems,
  addCourse,
  removeCourse,
  clearCart,
  updateCoursePriority,
  updateCourseNotes,
  maxCourses = 8,
  hideFab = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitToAdvisor, setSubmitToAdvisor] = useState(false);

  // Use conflict detection
  const { conflicts, hasConflicts } = useConflictDetection(cartItems);

  const handleFinalizePlan = async () => {
    if (hasConflicts) {
      return; // Don't allow finalization with conflicts
    }

    try {
      setIsProcessing(true);
      await onFinalizePlan(cartItems, submitToAdvisor);
      // Clear cart after successful finalization
      setSubmitToAdvisor(false); // Reset toggle after finalization
    } catch (error) {
      console.error('Failed to finalize plan:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalUnits = () => {
    return cartItems.reduce((total, item) => total + item.units, 0);
  };

  const getCoursesByTerm = () => {
    return cartItems.reduce((acc, item) => {
      const termKey = `${item.term} ${item.year}`;
      if (!acc[termKey]) acc[termKey] = [];
      acc[termKey].push(item);
      return acc;
    }, {} as Record<string, CourseCartItem[]>);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-3 h-3" />;
      case 'medium': return <Clock className="w-3 h-3" />;
      case 'low': return <Minus className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  // Split-mode container (no fixed overlay)
  if (layoutMode === 'split') {
    return (
      <div
        className="h-full border-l bg-background flex flex-col"
        style={{ width: widthPx ? `${widthPx}px` : 400 }}
      >
        <Card className="h-full rounded-none border-0">
          {/* (same inner content as before, remove outer fixed wrapper) */}
          {/* Keep everything from <CardHeader> through actions unchanged */}
          {/* BEGIN moved content */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <CardTitle>Course Cart</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              Preview your course selections ({cartItems.length}/{maxCourses} courses)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-full flex flex-col">
            {cartItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div>
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">Add courses to preview your schedule</p>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Section */}
                <div className="p-4 border-b bg-muted/20">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Total Units: {getTotalUnits()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{Object.keys(getCoursesByTerm()).length} Term(s)</span>
                    </div>
                  </div>

                  {hasConflicts && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Course List */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {Object.entries(getCoursesByTerm()).map(([term, courses]) => (
                      <div key={term}>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">{term}</h4>
                        <div className="space-y-2">
                          {courses.map((course) => (
                            <div key={course.id} className="border rounded-lg p-3 bg-card">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">
                                      {course.course_code} {course.course_number}
                                    </span>
                                    <Badge
                                      variant={getPriorityColor(course.priority) as any}
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      {getPriorityIcon(course.priority)}
                                      {course.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {course.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {course.units} units
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCourse(course.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>

                              {/* New: inline priority & notes editing */}
                              <div className="grid grid-cols-2 gap-3 mt-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Priority</label>
                                  <div className="flex gap-1 mt-1">
                                    <Button
                                      variant={course.priority === 'high' ? 'destructive' : 'outline'}
                                      size="sm"
                                      onClick={() => updateCoursePriority(course.id, 'high')}
                                    >
                                      High
                                    </Button>
                                    <Button
                                      variant={course.priority === 'medium' ? 'secondary' : 'outline'}
                                      size="sm"
                                      onClick={() => updateCoursePriority(course.id, 'medium')}
                                    >
                                      Medium
                                    </Button>
                                    <Button
                                      variant={course.priority === 'low' ? 'outline' : 'outline'}
                                      size="sm"
                                      onClick={() => updateCoursePriority(course.id, 'low')}
                                    >
                                      Low
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Notes</label>
                                  <Input
                                    placeholder="Optional notes"
                                    value={course.notes || ''}
                                    onChange={(e) => updateCourseNotes(course.id, e.target.value)} // NEW
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {term !== Object.keys(getCoursesByTerm()).pop() && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Conflict Details */}
                {hasConflicts && (
                  <div className="p-4 border-t border-b bg-destructive/5">
                    <ConflictIndicator conflicts={conflicts} />
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t space-y-3">
                  {/* Submit to Advisor Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" />
                      <Label htmlFor="submit-toggle" className="cursor-pointer">
                        <span className="font-medium">Submit for Review</span>
                        <p className="text-xs text-muted-foreground">
                          Send plan to advisor for approval
                        </p>
                      </Label>
                    </div>
                    <Switch
                      id="submit-toggle"
                      checked={submitToAdvisor}
                      onCheckedChange={setSubmitToAdvisor}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleFinalizePlan}
                      disabled={hasConflicts || cartItems.length === 0 || isProcessing}
                      className="flex-1"
                      variant={submitToAdvisor ? "default" : "secondary"}
                    >
                      {isProcessing ? (
                        'Processing...'
                      ) : hasConflicts ? (
                        'Resolve Conflicts First'
                      ) : submitToAdvisor ? (
                        <>
                          Submit to Advisor
                          <Send className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Save as Draft
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    disabled={cartItems.length === 0}
                    className="w-full"
                  >
                    Clear Cart
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overlay mode (original behavior)
  if (!isOpen) {
    if (hideFab) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          className="rounded-full w-14 h-14 shadow-lg relative"
          size="lg"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartItems.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {cartItems.length}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-50">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <CardTitle>Course Cart</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Preview your course selections ({cartItems.length}/{maxCourses} courses)
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 h-full flex flex-col">
          {cartItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Your cart is empty</p>
                <p className="text-sm text-muted-foreground">Add courses to preview your schedule</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="p-4 border-b bg-muted/20">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Total Units: {getTotalUnits()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{Object.keys(getCoursesByTerm()).length} Term(s)</span>
                  </div>
                </div>

                {hasConflicts && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Course List */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {Object.entries(getCoursesByTerm()).map(([term, courses]) => (
                    <div key={term}>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">{term}</h4>
                      <div className="space-y-2">
                        {courses.map((course) => (
                          <div key={course.id} className="border rounded-lg p-3 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {course.course_code} {course.course_number}
                                  </span>
                                  <Badge
                                    variant={getPriorityColor(course.priority) as any}
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    {getPriorityIcon(course.priority)}
                                    {course.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {course.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {course.units} units
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCourse(course.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* New: inline priority & notes editing */}
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div>
                                <label className="text-xs text-muted-foreground">Priority</label>
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    variant={course.priority === 'high' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => updateCoursePriority(course.id, 'high')}
                                  >
                                    High
                                  </Button>
                                  <Button
                                    variant={course.priority === 'medium' ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => updateCoursePriority(course.id, 'medium')}
                                  >
                                    Medium
                                  </Button>
                                  <Button
                                    variant={course.priority === 'low' ? 'outline' : 'outline'}
                                    size="sm"
                                    onClick={() => updateCoursePriority(course.id, 'low')}
                                  >
                                    Low
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Notes</label>
                                <Input
                                  placeholder="Optional notes"
                                  value={course.notes || ''}
                                  onChange={(e) => updateCourseNotes(course.id, e.target.value)} // NEW
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {term !== Object.keys(getCoursesByTerm()).pop() && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Conflict Details */}
              {hasConflicts && (
                <div className="p-4 border-t border-b bg-destructive/5">
                  <ConflictIndicator conflicts={conflicts} />
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleFinalizePlan}
                    disabled={hasConflicts || cartItems.length === 0 || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      'Processing...'
                    ) : hasConflicts ? (
                      'Resolve Conflicts First'
                    ) : (
                      'Finalize Plan'
                    )}
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  className="w-full"
                >
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook for managing course cart
export const useCourseCart = () => {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen(prev => !prev)
  };
};