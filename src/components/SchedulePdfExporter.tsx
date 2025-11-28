import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileDown, Printer, Calendar, Clock, User, GraduationCap } from 'lucide-react';
import { CourseType, courseTypeConfigs } from '@/components/CourseColorCoding';

interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
  term: string;
  year: string;
  type: CourseType;
  schedule?: {
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }[];
  instructor?: string;
}

interface StudentInfo {
  name: string;
  studentId: string;
  major: string;
  catalogYear?: string;
  totalUnits?: number;
}

interface PDFExportOptions {
  format: 'schedule' | 'list' | 'both';
  includeInstructor: boolean;
  includeRoom: boolean;
  includeCourseTypes: boolean;
  includeUnits: boolean;
  groupByTerm: boolean;
  colorCoded: boolean;
}

interface SchedulePDFExporterProps {
  courses: Course[];
  studentInfo: StudentInfo;
  onExport?: (success: boolean) => void;
}

export const SchedulePDFExporter: React.FC<SchedulePDFExporterProps> = ({
  courses,
  studentInfo,
  onExport
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    format: 'both',
    includeInstructor: true,
    includeRoom: true,
    includeCourseTypes: true,
    includeUnits: true,
    groupByTerm: true,
    colorCoded: false // PDF doesn't support colors well, so default false
  });

  const [isExporting, setIsExporting] = useState(false);

  // Generate HTML content for PDF
  const generateHTMLContent = (): string => {
    const coursesByTerm = courses.reduce((acc, course) => {
      const termKey = `${course.term} ${course.year}`;
      if (!acc[termKey]) acc[termKey] = [];
      acc[termKey].push(course);
      return acc;
    }, {} as Record<string, Course[]>);

    const totalUnits = courses.reduce((total, course) => total + course.units, 0);

    const generateHeader = () => `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">Academic Schedule</h1>
        <div style="margin-top: 10px; font-size: 14px; color: #666;">
          <strong>${studentInfo.name}</strong> (ID: ${studentInfo.studentId})<br>
          Major: ${studentInfo.major} ${studentInfo.catalogYear ? `| Catalog Year: ${studentInfo.catalogYear}` : ''}<br>
          Total Units: ${totalUnits} | Generated: ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;

    const generateScheduleTable = (termCourses: Course[], termName: string) => {
      const timeSlots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      return `
        <h3 style="margin: 20px 0 10px 0; color: #333;">${termName}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
              ${days.map(day => `<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${day}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${timeSlots.map(time => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background-color: #fafafa;">${time}</td>
                ${days.map(day => {
                  const coursesAtTime = termCourses.filter(course =>
                    course.schedule?.some(sched =>
                      sched.day.toLowerCase().includes(day.toLowerCase().substring(0, 3)) &&
                      sched.startTime === time
                    )
                  );

                  if (coursesAtTime.length > 0) {
                    const course = coursesAtTime[0];
                    return `<td style="border: 1px solid #ddd; padding: 8px; background-color: #e3f2fd;">
                      <strong>${course.course_code} ${course.course_number}</strong><br>
                      <small>${course.title.substring(0, 25)}${course.title.length > 25 ? '...' : ''}</small>
                      ${options.includeRoom && course.schedule?.[0]?.room ? `<br><em>${course.schedule[0].room}</em>` : ''}
                    </td>`;
                  }
                  return `<td style="border: 1px solid #ddd; padding: 8px;"></td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    const generateCourseList = (termCourses: Course[], termName: string) => `
      <h3 style="margin: 20px 0 10px 0; color: #333;">${termName}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Course</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Title</th>
            ${options.includeUnits ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Units</th>' : ''}
            ${options.includeCourseTypes ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>' : ''}
            ${options.includeInstructor ? '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Instructor</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${termCourses.map(course => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>${course.course_code} ${course.course_number}</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${course.title}</td>
              ${options.includeUnits ? `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${course.units}</td>` : ''}
              ${options.includeCourseTypes ? `<td style="border: 1px solid #ddd; padding: 8px;">${courseTypeConfigs[course.type]?.label || 'Unknown'}</td>` : ''}
              ${options.includeInstructor ? `<td style="border: 1px solid #ddd; padding: 8px;">${course.instructor || 'TBA'}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin: 10px 0; font-size: 12px; color: #666;">
        <strong>Term Total: ${termCourses.reduce((sum, c) => sum + c.units, 0)} units</strong>
      </p>
    `;

    let content = `
      <html>
        <head>
          <title>Academic Schedule - ${studentInfo.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.4; }
            @media print {
              body { margin: 20px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${generateHeader()}
    `;

    if (options.groupByTerm) {
      Object.entries(coursesByTerm).forEach(([term, termCourses], index) => {
        if (index > 0) content += '<div class="page-break"></div>';

        if (options.format === 'schedule' || options.format === 'both') {
          content += generateScheduleTable(termCourses, term);
        }

        if (options.format === 'list' || options.format === 'both') {
          content += generateCourseList(termCourses, term);
        }
      });
    } else {
      if (options.format === 'schedule' || options.format === 'both') {
        content += generateScheduleTable(courses, 'All Courses');
      }

      if (options.format === 'list' || options.format === 'both') {
        content += generateCourseList(courses, 'All Courses');
      }
    }

    content += '</body></html>';
    return content;
  };

  const handlePrint = () => {
    const htmlContent = generateHTMLContent();
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);

      // For a real implementation, you'd use a library like jsPDF or Puppeteer
      // Here's a simplified version that creates an HTML file for download
      const htmlContent = generateHTMLContent();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${studentInfo.name.replace(/\s+/g, '_')}_schedule.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExport?.(true);
    } catch (error) {
      console.error('Export failed:', error);
      onExport?.(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Export Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Export Format</label>
          <Select
            value={options.format}
            onValueChange={(value: any) => setOptions(prev => ({ ...prev, format: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="schedule">Schedule Grid Only</SelectItem>
              <SelectItem value="list">Course List Only</SelectItem>
              <SelectItem value="both">Both Schedule & List</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Include in Export</label>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instructor"
                checked={options.includeInstructor}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeInstructor: checked as boolean }))
                }
              />
              <label htmlFor="instructor" className="text-sm">Instructor Names</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="room"
                checked={options.includeRoom}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeRoom: checked as boolean }))
                }
              />
              <label htmlFor="room" className="text-sm">Room Numbers</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="types"
                checked={options.includeCourseTypes}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeCourseTypes: checked as boolean }))
                }
              />
              <label htmlFor="types" className="text-sm">Course Types</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="units"
                checked={options.includeUnits}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeUnits: checked as boolean }))
                }
              />
              <label htmlFor="units" className="text-sm">Unit Counts</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupByTerm"
                checked={options.groupByTerm}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, groupByTerm: checked as boolean }))
                }
              />
              <label htmlFor="groupByTerm" className="text-sm">Group by Term</label>
            </div>
          </div>
        </div>

        {/* Course Summary */}
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Ready to export {courses.length} courses ({courses.reduce((sum, c) => sum + c.units, 0)} units total)
            {options.groupByTerm && ` across ${new Set(courses.map(c => `${c.term} ${c.year}`)).size} terms`}
          </AlertDescription>
        </Alert>

        {/* Export Actions */}
        <div className="flex gap-3">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print Schedule
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting || courses.length === 0}
            className="flex-1"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          PDF export generates an HTML file that can be printed to PDF or opened in any browser.
        </p>
      </CardContent>
    </Card>
  );
};